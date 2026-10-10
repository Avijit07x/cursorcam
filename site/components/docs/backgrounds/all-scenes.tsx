import { getSceneLooks } from '@/lib/docs';
import { SceneGallery } from './scene-gallery';

export async function AllScenes() {
  return <SceneGallery scenes={await getSceneLooks()} />;
}
