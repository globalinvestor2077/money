import { MoneyDetailClient } from './MoneyDetailClient';

export default async function MoneyDetailPage({ params }: { params: Promise<{ questionId: string }> }) {
  const { questionId } = await params;
  return <MoneyDetailClient questionId={questionId} />;
}
