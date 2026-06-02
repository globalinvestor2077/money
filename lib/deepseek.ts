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

const GENERATE_BATCH_PROMPT = `你是一个专业的金融内容创作者，擅长基金和保险领域的知识科普。
请生成5个金融问答对，涵盖基金和保险两个领域（比例约3:2或2:3随机）。

要求：
- 每个问答对包含：问题标题（10-20字）、问题摘要（20-40字）、分类（fund或insurance）、标签（2-4个中文标签）、来源标识（统一使用"金融知识库"作为来源名称，基金类职称使用"基金科普"、保险类职称使用"保险科普"，机构使用"本站内容库"）、回答内容（200-400字）
- 话题要多样化，覆盖基金定投、ETF、指数基金、主动基金、债券基金、重疾险、医疗险、意外险、年金险等不同细分话题
- 回答要专业、客观、易懂，面向普通投资者
- 基金类回答必须包含风险提示，如"基金投资有风险，过往业绩不预示未来表现"
- 保险类回答必须包含提示，如"具体保障以保险合同条款为准"
- 不要生成重复或过于相似的问题

严格以JSON数组格式返回，不要包含任何其他文字：
[{"category":"fund","title":"...","summary":"...","tags":["标签1","标签2"],"expert":{"name":"金融知识库","title":"基金科普","organization":"本站内容库"},"content":"..."}]`;

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

export async function generateQaContent(): Promise<GeneratedQaItem[]> {
  const raw = await chatCompletion([
    { role: 'system', content: GENERATE_BATCH_PROMPT },
    { role: 'user', content: '请生成一批新的金融问答内容，确保话题与之前不重复。' }
  ]);

  const jsonStr = raw.replace(/```json\s*|```\s*/g, '').trim();
  const items: GeneratedQaItem[] = JSON.parse(jsonStr);

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('DeepSeek returned invalid QA items');
  }

  for (const item of items) {
    if (!['fund', 'insurance'].includes(item.category)) {
      throw new Error(`Invalid category: ${item.category}`);
    }
    if (!item.title || !item.content || !item.expert?.name) {
      throw new Error('Missing required fields in QA item');
    }
  }

  return items;
}

export async function generateAnswerForQuestion(
  questionTitle: string,
  questionContent: string,
  category: 'fund' | 'insurance'
): Promise<GeneratedSingleAnswer> {
  const categoryLabel = category === 'fund' ? '基金' : '保险';
  const riskNote = category === 'fund'
    ? '必须包含风险提示"基金投资有风险，过往业绩不预示未来表现，本文不构成投资建议"。'
    : '必须包含提示"具体保障以保险合同条款为准，本文仅作知识科普"。';

  const raw = await chatCompletion([
    {
      role: 'system',
      content: `你是一个专业的金融内容创作者，擅长${categoryLabel}领域的知识科普。
用户提交了一个${categoryLabel}相关问题，请你为该问题撰写摘要、标签、来源信息和专业回答。

${riskNote}
回答要专业、客观、易懂，200-400字。
来源统一使用"金融知识库"作为名称，基金类职称使用"基金科普"、保险类职称使用"保险科普"，机构使用"本站内容库"。

严格以JSON格式返回，不要包含任何其他文字：
{"summary":"20-40字摘要","tags":["标签1","标签2"],"expert":{"name":"金融知识库","title":"基金科普","organization":"本站内容库"},"content":"回答内容"}`
    },
    {
      role: 'user',
      content: `问题标题：${questionTitle}\n问题补充：${questionContent}`
    }
  ], 2048);

  const jsonStr = raw.replace(/```json\s*|```\s*/g, '').trim();
  const result: GeneratedSingleAnswer = JSON.parse(jsonStr);

  if (!result.content || !result.expert?.name) {
    throw new Error('DeepSeek returned incomplete answer data');
  }

  return result;
}
