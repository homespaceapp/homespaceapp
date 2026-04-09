import { getWishList } from './actions';
import PlanowaneClient from './PlanowaneClient';
export const dynamic = 'force-dynamic';
export default async function PlanowanePage() {
  const items = await getWishList();
  return <PlanowaneClient initialItems={items as never} />;
}
