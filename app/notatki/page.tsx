import { getNotes } from './actions';
import NotatkiClient from './NotatkiClient';

export const dynamic = 'force-dynamic';

export default async function NotatkiPage() {
  const notes = await getNotes();
  return <NotatkiClient initialNotes={notes as never} />;
}
