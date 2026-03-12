import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { PlannerPage, type SerializedMenu } from '@/components/menu/planner-page';
import { isFamilyRole } from '@/lib/auth/authorization';
import { getSessionFromCookies } from '@/lib/auth/session';
import { getOrCreateMenuForWeek } from '@/lib/menu/service';
import { getAllRecipes, type RecipePreview } from '@/lib/recipes/loader';

export const metadata = {
  title: 'Menu Planner | Family Recipes',
  description: 'Plan your weekly meals',
};

export default async function MenuPage() {
  const cookieStore = await cookies();
  const user = await getSessionFromCookies(cookieStore);

  if (!(user && isFamilyRole(user.role))) {
    redirect('/recipes');
  }

  const [menu, recipes] = await Promise.all([getOrCreateMenuForWeek(user.id), getAllRecipes()]);

  const serializedMenu = JSON.parse(JSON.stringify(menu)) as SerializedMenu;
  const recipePreviews: RecipePreview[] = recipes;

  return (
    <MainLayout isFamily={true}>
      <div className="px-6 py-6">
        <div className="mx-auto w-full max-w-6xl">
          <PlannerPage initialMenu={serializedMenu} recipes={recipePreviews} userId={user.id} />
        </div>
      </div>
    </MainLayout>
  );
}
