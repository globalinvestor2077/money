const DEEPSEEK_BASE = 'https://api.deepseek.com/v1';

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GeneratedQaItem {
  category: 'fund' | 'insurance';
  title: string;
  summary: string;
  tags: string[];
  expert: { name: string; title: string; organization: string };
  content: string;
}

interface GeneratedSingleAnswer {
  summary: string;
  tags: string[];
  expert: { name: string; title: string; organization: string };
  content: string;
}

function buildGeneratePrompt(existingTitles: string[], count: number): string {
  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  const now = new Date().toISOString().replace('T', ' ').slice(0, 10);

  const existingList = existingTitles.length
    ? `\n## 以下话题已经存在，请严格避免生成相似或重复的内容：\n${existingTitles.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n`
    : '';

  return `你是一个专业的金融内容创作者，擅长基金和保险领域的知识科普。
当前日期：${today}（${now}）。请基于该时间点生成内容，体现最新的市场环境和政策动态。

## 核心要求

### 内容时效性（重要）
- 回答中必须融入当前市场实际数据、近期政策变化、行业趋势或热点事件
- 基金类可引用当前的指数点位、热门板块轮动、近期新发基金趋势、监管政策调整等真实背景
- 保险类可引用当前的监管新规、产品利率调整、行业改革动态、人口结构变化等真实背景
- 数据引用要合理可信，可以使用近似值但不能凭空编造
- 避免使用"近年来""近期"等模糊表述，尽量给出具体时间段或事件

### 格式要求
- 生成${count}个金融问答对，基金:保险比例随机约3:2或2:3
- 问题标题：10-20字，要有话题性和搜索价值
- 问题摘要：20-40字，概括问题要点
- 分类：fund 或 insurance
- 标签：2-4个中文标签
- 来源标识：统一使用"金融知识库"作为来源名称，基金类职称使用"基金科普"、保险类职称使用"保险科普"，机构使用"本站内容库"
- 回答内容：250-500字，有干货、有数据、有观点
${existingList}
### 话题多样性
覆盖基金定投、ETF、指数基金、行业基金、债券基金、养老FOF、重疾险、医疗险、意外险、年金险、增额寿险等不同细分话题。每次生成尽量选择不同话题角度。

### 质量要求
- 面向普通投资者，专业但不晦涩
- 基金类必须包含风险提示："基金投资有风险，过往业绩不预示未来表现，本文不构成投资建议"
- 保险类必须包含提示："具体保障以保险合同条款为准，本文仅作知识科普"

严格以JSON数组格式返回，不要包含任何其他文字：
[{"category":"fund","title":"...","summary":"...","tags":["标签1","标签2"],"expert":{"name":"金融知识库","title":"基金科普","organization":"本站内容库"},"content":"..."}]`;
}

function getApiConfig() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('Missing DEEPSEEK_API_KEY environment variable');
  }
  return {
    apiKey,
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat'
  };
}

async function chatCompletion(messages: DeepSeekMessage[], maxTokens = 4096): Promise<string> {
  const { apiKey, model } = getApiConfig();

  const response = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.8,
      max_tokens: maxTokens
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) {
    throw new Error('DeepSeek returned empty response');
  }

  return raw;
}

const GENERATE_TARGET_COUNT = 10;
const GENERATE_BATCH_SIZE = 10;

function parseQaItems(raw: string): GeneratedQaItem[] {
  const jsonStr = raw.replace(/```json\s*|```\s*/g, '').trim();
  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? (parsed as GeneratedQaItem[]) : [];
  } catch {
    // 输出被 max_tokens 截断时，补全数组结尾，抢救已完整的条目
    const lastBrace = jsonStr.lastIndexOf('}');
    if (lastBrace > 0) {
      try {
        const repaired = jsonStr.slice(0, lastBrace + 1) + ']';
        const parsed = JSON.parse(repaired);
        return Array.isArray(parsed) ? (parsed as GeneratedQaItem[]) : [];
      } catch {
        return [];
      }
    }
    return [];
  }
}

async function generateQaBatch(existingTitles: string[], count: number): Promise<GeneratedQaItem[]> {
  const systemPrompt = buildGeneratePrompt(existingTitles, count);
  const userSuffix = existingTitles.length
    ? `\n请严格避开上述${existingTitles.length}个已有话题，生成全新方向的金融问答内容。`
    : '\n请生成一批新的金融问答内容，确保话题多样化且具有时效性。';

  const raw = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `请生成${count}条新的金融问答内容。${userSuffix}` }
    ],
    8192
  );

  return parseQaItems(raw);
}

export async function generateQaContent(existingTitles: string[] = []): Promise<GeneratedQaItem[]> {
  const seenTitles = new Set(existingTitles.map((title) => title.trim()));
  const batchCount = Math.ceil(GENERATE_TARGET_COUNT / GENERATE_BATCH_SIZE);

  // 并发跑多个批次，缩短总耗时；allSettled 让单批失败不影响其他批
  const settled = await Promise.allSettled(
    Array.from({ length: batchCount }, () => generateQaBatch([...seenTitles], GENERATE_BATCH_SIZE))
  );

  const collected: GeneratedQaItem[] = [];
  let lastError: unknown = null;
  for (const result of settled) {
    if (result.status === 'rejected') {
      lastError = result.reason;
      console.error('[generateQaContent] batch failed:', result.reason);
      continue;
    }
    for (const item of result.value) {
      if (!['fund', 'insurance'].includes(item.category)) continue;
      if (!item.title || !item.content || !item.expert?.name) continue;
      const title = item.title.trim();
      if (seenTitles.has(title)) continue;
      seenTitles.add(title);
      collected.push(item);
    }
  }

  if (collected.length === 0) {
    throw lastError instanceof Error
      ? new Error(`内容生成失败：${lastError.message}`)
      : new Error('内容生成失败：DeepSeek 未返回有效内容');
  }

  return collected;
}

export async function generateAnswerForQuestion(
  questionTitle: string,
  questionContent: string,
  category: 'fund' | 'insurance'
): Promise<GeneratedSingleAnswer> {
  const categoryLabel = category === 'fund' ? '基金' : '保险';
  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  const riskNote = category === 'fund'
    ? '必须包含风险提示"基金投资有风险，过往业绩不预示未来表现，本文不构成投资建议"。'
    : '必须包含提示"具体保障以保险合同条款为准，本文仅作知识科普"。';

  const raw = await chatCompletion([
    {
      role: 'system',
      content: `你是一个专业的金融内容创作者，擅长${categoryLabel}领域的知识科普。
当前日期：${today}。请基于该时间点，结合当前市场环境和政策动态撰写回答。

用户提交了一个${categoryLabel}相关问题，请你为该问题撰写摘要、标签、来源信息和专业回答。

${riskNote}
回答要专业、客观、易懂，250-500字，尽量包含实际数据或政策背景以增强时效性。
来源统一使用"金融知识库"作为名称，基金类职称使用"基金科普"、保险类职称使用"保险科普"，机构使用"本站内容库"。

严格以JSON格式返回，不要包含任何其他文字：
{"summary":"20-40字摘要","tags":["标签1","标签2"],"expert":{"name":"金融知识库","title":"基金科普","organization":"本站内容库"},"content":"回答内容"}`
    },
    {
      role: 'user',
      content: `问题标题：${questionTitle}\n问题补充：${questionContent}`
    }
  ], 4096);

  const jsonStr = raw.replace(/```json\s*|```\s*/g, '').trim();
  const result: GeneratedSingleAnswer = JSON.parse(jsonStr);

  if (!result.content || !result.expert?.name) {
    throw new Error('DeepSeek returned incomplete answer data');
  }

  return result;
}
