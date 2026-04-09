import { getContacts } from './actions';
import KontaktyClient from './KontaktyClient';

export const dynamic = 'force-dynamic';

export default async function KontaktyPage() {
  const contacts = await getContacts();
  return <KontaktyClient initialContacts={contacts as never} />;
}
