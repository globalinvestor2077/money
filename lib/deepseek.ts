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

const SYSTEM_PROMPT = `你是一个专业的金融内容创作者，擅长基金和保险领域的知识科普。
请生成5个金融问答对，涵盖基金和保险两个领域（比例约3:2或2:3随机）。

要求：
- 每个问答对包含：问题标题（10-20字）、问题摘要（20-40字）、分类（fund或insurance）、标签（2-4个中文标签）、作者信息（姓名2-3字中文名、职称、机构）、回答内容（200-400字）
- 话题要多样化，覆盖基金定投、ETF、指数基金、主动基金、债券基金、重疾险、医疗险、意外险、年金险等不同细分话题
- 回答要专业、客观、易懂，面向普通投资者
- 基金类回答必须包含风险提示，如"基金投资有风险，过往业绩不预示未来表现"
- 保险类回答必须包含提示，如"具体保障以保险合同条款为准"
- 不要生成重复或过于相似的问题

严格以JSON数组格式返回，不要包含任何其他文字：
[{"category":"fund","title":"...","summary":"...","tags":["标签1","标签2"],"expert":{"name":"...","title":"...","organization":"..."},"content":"..."}]`;

export async function generateQaContent(): Promise<GeneratedQaItem[]> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('Missing DEEPSEEK_API_KEY environment variable');
  }

  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  const messages: DeepSeekMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: '请生成一批新的金融问答内容，确保话题与之前不重复。' }
  ];

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
      max_tokens: 4096
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
