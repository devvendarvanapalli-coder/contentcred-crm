import {Composition} from 'remotion';
import {MyComposition} from './Composition';
export const RemotionRoot: React.FC = () => (
  <><Composition id="MyComposition" component={MyComposition} durationInFrames={390} fps={30} width={1080} height={1920}/></>
);
