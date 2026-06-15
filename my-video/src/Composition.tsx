import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Sequence, Img} from 'remotion';

const ACCENT = '#00f0ff';
const BG = '#080808';
const RED = '#ff2020';

const gdrive = (id: string) => `https://drive.google.com/uc?export=view&id=${id}`;

const ASSETS = {
	sadFace:      gdrive('19fmoPPlaC18v-h0AffhxvagCOvZnMpCa'),
	manTyping:    gdrive('1-152YXgB4bj2jUYQDdDxF2fGRFsxfKMe'),
	manPhone:     gdrive('1rNY5I14hR6V8nrVPoJjLKFRGKh3EpAf1'),
	bigYoutuber:  gdrive('1FpknmBZmCasVP860X6Xi1xUzLsObe8DY'),
	winMan:       gdrive('1fPZ7zUpXnPYW07XMcN2sQtpygdMHXMLn'),
	manWithMoney: gdrive('1nFDa9Tg2Ly8HhypRFEMQ1m5sasJB-Uhq'),
	thumbsUp:     gdrive('1Ui2u37GOYZm2R8oJFJUesV9MPBnt7NbW'),
	redCarpet:    gdrive('1F91DmkGMgE5JKjlNGV89FmROIj43TJnO'),
};

// ─── Custom Hooks ───────────────────────────────────────────────────────────

const useSlamAnim = (delay = 0) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const f = Math.max(0, frame - delay);
	const s = spring({frame: f, fps, config: {stiffness: 500, damping: 28, mass: 0.4}});
	return {
		opacity: Math.min(1, f * 3),
		scale: interpolate(s, [0, 1], [2.1, 1]),
	};
};

const useSlideIn = (delay = 0, from: 'left' | 'right' | 'bottom' = 'bottom') => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const f = Math.max(0, frame - delay);
	const s = spring({frame: f, fps, config: {stiffness: 100, damping: 16, mass: 0.9}});
	const offset = interpolate(s, [0, 1], [360, 0]);
	const tx = from === 'left' ? -offset : from === 'right' ? offset : 0;
	const ty = from === 'bottom' ? offset : 0;
	return {
		opacity: Math.min(1, f / 6),
		transform: `translate(${tx}px, ${ty}px)`,
	};
};

// ─── Shared UI ──────────────────────────────────────────────────────────────

const Vignette = () => (
	<AbsoluteFill style={{
		background: 'radial-gradient(ellipse at center, transparent 28%, rgba(0,0,0,0.72) 100%)',
		pointerEvents: 'none',
		zIndex: 50,
	}} />
);

const Flash: React.FC<{at: number}> = ({at}) => {
	const frame = useCurrentFrame();
	const f = frame - at;
	if (f < 0 || f > 8) return null;
	return (
		<AbsoluteFill style={{
			background: '#fff',
			opacity: interpolate(f, [0, 2, 8], [0, 1, 0]),
			zIndex: 200, pointerEvents: 'none',
		}} />
	);
};

const AccentLine: React.FC<{opacity: number; width?: number}> = ({opacity, width = 54}) => (
	<div style={{width, height: 4, background: ACCENT, borderRadius: 2, opacity}} />
);

// ─── SCENE 1 · HOOK (0–49f) ─────────────────────────────────────────────────
// "STILL GETTING 0 VIEWS?" — red energy, sad face rises from bottom
const SceneHook = () => {
	const text1 = useSlamAnim(2);
	const text2 = useSlamAnim(10);
	const img   = useSlideIn(5, 'bottom');

	return (
		<AbsoluteFill style={{background: BG, overflow: 'hidden'}}>
			<AbsoluteFill style={{
				background: 'radial-gradient(ellipse at 50% 90%, rgba(255,30,30,0.20) 0%, transparent 58%)',
				pointerEvents: 'none',
			}} />

			{/* Sad face character */}
			<div style={{
				position: 'absolute', bottom: -50, left: '50%',
				width: '90%', opacity: img.opacity,
				transform: `translateX(-50%) ${img.transform}`,
			}}>
				<Img src={ASSETS.sadFace} style={{width: '100%', objectFit: 'contain'}} />
			</div>

			{/* Hook copy */}
			<div style={{
				position: 'absolute', top: 210, left: 0, right: 0,
				display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10,
			}}>
				<div style={{
					fontFamily: '"Arial Black", sans-serif',
					fontSize: 74, fontWeight: 900, color: '#fff',
					textTransform: 'uppercase', letterSpacing: 3, textAlign: 'center',
					opacity: text1.opacity, transform: `scale(${text1.scale})`,
				}}>
					STILL GETTING
				</div>
				<div style={{
					fontFamily: '"Arial Black", sans-serif',
					fontSize: 200, fontWeight: 900, color: RED, lineHeight: 0.82,
					textShadow: '0 0 90px rgba(255,30,30,0.75)', textAlign: 'center',
					opacity: text2.opacity, transform: `scale(${text2.scale})`,
				}}>
					0<br />VIEWS?
				</div>
			</div>

			<Vignette />
		</AbsoluteFill>
	);
};

// ─── SCENE 2 · REVEAL (50–124f) ──────────────────────────────────────────────
// CONTENTCRED logo explodes — red carpet rolls in, chromatic glow
const SceneReveal = () => {
	const frame = useCurrentFrame();
	const logo   = useSlamAnim(5);
	const sub    = useSlideIn(28, 'bottom');
	const carpet = useSlideIn(2, 'bottom');
	const pulse  = Math.sin(frame / 7) * 0.15 + 0.85;

	return (
		<AbsoluteFill style={{background: BG, overflow: 'hidden'}}>
			<AbsoluteFill style={{
				background: `radial-gradient(ellipse at 50% 32%, rgba(0,240,255,${0.20 * pulse}) 0%, transparent 58%)`,
				pointerEvents: 'none',
			}} />

			{/* Red carpet */}
			<div style={{
				position: 'absolute', bottom: -50, left: '50%', width: '115%',
				opacity: carpet.opacity * 0.85,
				transform: `translateX(-50%) ${carpet.transform}`,
			}}>
				<Img src={ASSETS.redCarpet} style={{width: '100%', objectFit: 'contain'}} />
			</div>

			{/* Wordmark */}
			<div style={{
				position: 'absolute', top: '20%', left: 0, right: 0,
				display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10,
			}}>
				<div style={{
					fontFamily: '"Arial Black", sans-serif',
					fontSize: 106, fontWeight: 900, color: '#fff',
					textTransform: 'uppercase', letterSpacing: 4, textAlign: 'center', lineHeight: 1.05,
					textShadow: `0 0 100px rgba(0,240,255,0.55), 3px 0 rgba(255,0,0,0.4), -3px 0 rgba(0,255,255,0.4)`,
					opacity: logo.opacity, transform: `scale(${logo.scale})`,
				}}>
					CONTENT<br /><span style={{color: ACCENT}}>CRED</span>
				</div>

				{/* Animated divider */}
				<div style={{
					width: interpolate(logo.opacity, [0, 1], [0, 340]),
					height: 3,
					background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)`,
					margin: '26px 0 22px',
				}} />

				<div style={{
					fontFamily: 'Arial, sans-serif', fontSize: 30,
					color: 'rgba(255,255,255,0.78)', letterSpacing: 5,
					textTransform: 'uppercase', textAlign: 'center',
					...sub,
				}}>
					The #1 Clipping Agency
				</div>
			</div>

			<Vignette />
		</AbsoluteFill>
	);
};

// ─── SERVICE SCENE (template) ────────────────────────────────────────────────
const ServiceScene: React.FC<{
	imgSrc: string;
	imgSide: 'left' | 'right';
	line1: string;
	line2: string;
}> = ({imgSrc, imgSide, line1, line2}) => {
	const img      = useSlideIn(2, imgSide);
	const accent   = useSlamAnim(8);
	const heading  = useSlamAnim(10);
	const body     = useSlideIn(22, 'bottom');
	const textSide = imgSide === 'left' ? 'right' : 'left';

	return (
		<AbsoluteFill style={{background: BG, overflow: 'hidden'}}>
			<AbsoluteFill style={{
				background: `radial-gradient(ellipse at ${imgSide === 'left' ? '22% 62%' : '78% 62%'}, rgba(0,240,255,0.08) 0%, transparent 52%)`,
				pointerEvents: 'none',
			}} />

			{/* Character PNG */}
			<div style={{
				position: 'absolute',
				...(imgSide === 'left' ? {left: -20} : {right: -20}),
				bottom: 0, height: '70%',
				...img,
			}}>
				<Img src={imgSrc} style={{height: '100%', objectFit: 'contain'}} />
			</div>

			{/* Text block */}
			<div style={{
				position: 'absolute',
				...(textSide === 'left' ? {left: 52} : {right: 52}),
				top: '26%', maxWidth: 450,
				display: 'flex', flexDirection: 'column', gap: 14,
			}}>
				<AccentLine opacity={accent.opacity} />
				<div style={{
					fontFamily: '"Arial Black", sans-serif',
					fontSize: 56, fontWeight: 900, color: '#fff',
					textTransform: 'uppercase', lineHeight: 1.05,
					opacity: heading.opacity, transform: `scale(${heading.scale})`,
					transformOrigin: `${textSide} center`,
				}}>
					{line1}
				</div>
				<div style={{
					fontFamily: 'Arial, sans-serif', fontSize: 23,
					color: 'rgba(255,255,255,0.52)', lineHeight: 1.5,
					...body,
				}}>
					{line2}
				</div>
			</div>

			<Vignette />
		</AbsoluteFill>
	);
};

// ─── SCENE · PROOF (269–323f) ────────────────────────────────────────────────
// Win man + man with money — "OUR CLIENTS GO VIRAL 🔥"
const SceneProof = () => {
	const left = useSlideIn(2, 'left');
	const right = useSlideIn(8, 'right');
	const text  = useSlamAnim(14);

	return (
		<AbsoluteFill style={{background: BG, overflow: 'hidden'}}>
			<AbsoluteFill style={{
				background: 'radial-gradient(ellipse at 50% 50%, rgba(0,240,255,0.10) 0%, transparent 58%)',
				pointerEvents: 'none',
			}} />

			<div style={{position: 'absolute', left: -20, bottom: 0, height: '70%', ...left}}>
				<Img src={ASSETS.winMan} style={{height: '100%', objectFit: 'contain'}} />
			</div>
			<div style={{position: 'absolute', right: -20, bottom: 0, height: '70%', ...right}}>
				<Img src={ASSETS.manWithMoney} style={{height: '100%', objectFit: 'contain'}} />
			</div>

			<div style={{
				position: 'absolute', top: 155, left: 0, right: 0,
				display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10,
			}}>
				<div style={{
					fontFamily: '"Arial Black", sans-serif',
					fontSize: 66, fontWeight: 900, color: '#fff',
					textAlign: 'center', textTransform: 'uppercase', lineHeight: 1.12,
					textShadow: '0 4px 48px rgba(0,0,0,0.95)',
					opacity: text.opacity, transform: `scale(${text.scale})`,
					padding: '0 36px',
				}}>
					OUR CLIENTS<br /><span style={{color: ACCENT}}>GO VIRAL 🔥</span>
				</div>
			</div>

			<Vignette />
		</AbsoluteFill>
	);
};

// ─── SCENE · CTA (324–389f) ──────────────────────────────────────────────────
// Thumbs up rises, "BOOK YOUR FREE CALL" slams, pulsing button
const SceneCTA = () => {
	const frame = useCurrentFrame();
	const img   = useSlideIn(3, 'bottom');
	const t1    = useSlamAnim(5);
	const t2    = useSlideIn(22, 'bottom');
	const btn   = useSlamAnim(38);
	const pulse = Math.sin(frame / 10) * 0.3 + 0.7;

	return (
		<AbsoluteFill style={{background: BG, overflow: 'hidden'}}>
			<AbsoluteFill style={{
				background: `radial-gradient(ellipse at 50% 88%, rgba(0,240,255,${0.16 * pulse}) 0%, transparent 52%)`,
				pointerEvents: 'none',
			}} />

			{/* Thumbs up */}
			<div style={{
				position: 'absolute', bottom: -30, left: '50%', width: '84%', zIndex: 1,
				opacity: img.opacity,
				transform: `translateX(-50%) ${img.transform}`,
			}}>
				<Img src={ASSETS.thumbsUp} style={{width: '100%', objectFit: 'contain'}} />
			</div>

			{/* CTA copy */}
			<div style={{
				position: 'absolute', top: 165, left: 0, right: 0,
				display: 'flex', flexDirection: 'column', alignItems: 'center',
				gap: 18, zIndex: 10,
			}}>
				<div style={{
					fontFamily: '"Arial Black", sans-serif',
					fontSize: 86, fontWeight: 900, color: '#fff',
					textAlign: 'center', textTransform: 'uppercase', lineHeight: 1,
					textShadow: '0 0 70px rgba(0,240,255,0.38)',
					opacity: t1.opacity, transform: `scale(${t1.scale})`,
					padding: '0 48px',
				}}>
					BOOK YOUR<br /><span style={{color: ACCENT}}>FREE CALL</span>
				</div>

				<div style={{
					fontFamily: 'Arial, sans-serif', fontSize: 28,
					color: 'rgba(255,255,255,0.52)', textAlign: 'center',
					...t2,
				}}>
					contentcred.com
				</div>

				<div style={{
					fontFamily: '"Arial Black", sans-serif',
					fontSize: 25, letterSpacing: 3, textTransform: 'uppercase',
					color: BG, background: ACCENT,
					padding: '22px 72px', borderRadius: 12,
					boxShadow: `0 0 72px rgba(0,240,255,${pulse * 0.65})`,
					opacity: btn.opacity, transform: `scale(${btn.scale})`,
				}}>
					Book Free Call ↗
				</div>
			</div>

			<Vignette />
		</AbsoluteFill>
	);
};

// ─── ROOT ────────────────────────────────────────────────────────────────────
export const MyComposition: React.FC = () => (
	<AbsoluteFill style={{background: BG}}>
		<Sequence from={0}   durationInFrames={50}><SceneHook /></Sequence>
		<Sequence from={50}  durationInFrames={75}><SceneReveal /></Sequence>
		<Sequence from={125} durationInFrames={48}>
			<ServiceScene imgSrc={ASSETS.manTyping}   imgSide="left"  line1="We clip your BEST moments"  line2="Hand-picked clips that stop the scroll instantly" />
		</Sequence>
		<Sequence from={173} durationInFrames={48}>
			<ServiceScene imgSrc={ASSETS.manPhone}    imgSide="right" line1="Optimized for VIRALITY"      line2="Captions, hooks & pacing that actually convert" />
		</Sequence>
		<Sequence from={221} durationInFrames={48}>
			<ServiceScene imgSrc={ASSETS.bigYoutuber} imgSide="left"  line1="Grow your AUDIENCE"          line2="Turn casual viewers into loyal, paying fans" />
		</Sequence>
		<Sequence from={269} durationInFrames={55}><SceneProof /></Sequence>
		<Sequence from={324} durationInFrames={66}><SceneCTA /></Sequence>

		{/* Flash cuts between every scene */}
		<Flash at={48}  />
		<Flash at={123} />
		<Flash at={171} />
		<Flash at={219} />
		<Flash at={267} />
		<Flash at={322} />
	</AbsoluteFill>
);
