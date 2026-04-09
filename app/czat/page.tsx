import { getMessages } from './actions';
import CzatClient from './CzatClient';

export const dynamic = 'force-dynamic';

export default async function CzatPage() {
  const messages = await getMessages();
  return <CzatClient initialMessages={messages as never} />;
}
