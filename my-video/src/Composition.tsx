import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Sequence} from 'remotion';

const ACCENT = '#00f0ff';
const BG = '#0a0a0a';

const FadeUp: React.FC<{delay?: number; children: React.ReactNode}> = ({delay = 0, children}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const progress = spring({frame: frame - delay, fps, config: {damping: 18, stiffness: 80}});
	return (
		<div style={{
			opacity: interpolate(progress, [0, 1], [0, 1]),
			transform: `translateY(${interpolate(progress, [0, 1], [40, 0])}px)`,
		}}>
			{children}
		</div>
	);
};

const Glow: React.FC = () => {
	const frame = useCurrentFrame();
	const pulse = Math.sin(frame / 30) * 0.15 + 0.85;
	return (
		<div style={{
			position: 'absolute',
			top: '50%',
			left: '50%',
			transform: 'translate(-50%, -50%)',
			width: 800,
			height: 800,
			borderRadius: '50%',
			background: `radial-gradient(circle, rgba(0,240,255,${0.08 * pulse}) 0%, transparent 70%)`,
			pointerEvents: 'none',
		}} />
	);
};

const HorizontalLine: React.FC<{delay?: number}> = ({delay = 0}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const progress = spring({frame: frame - delay, fps, config: {damping: 20, stiffness: 60}});
	return (
		<div style={{
			width: interpolate(progress, [0, 1], [0, 320]),
			height: 2,
			background: `linear-gradient(90deg, ${ACCENT}, transparent)`,
			margin: '16px 0',
		}} />
	);
};

// Scene 1: Agency name & tagline (0-90 frames)
const SceneIntro: React.FC = () => (
	<AbsoluteFill style={{background: BG, justifyContent: 'center', alignItems: 'center', flexDirection: 'column'}}>
		<Glow />
		<FadeUp delay={5}>
			<div style={{
				fontFamily: '"Arial Black", sans-serif',
				fontSize: 96,
				fontWeight: 900,
				color: '#fff',
				letterSpacing: 8,
				textTransform: 'uppercase',
				textShadow: `0 0 40px rgba(0,240,255,0.4)`,
			}}>
				CONTENT<span style={{color: ACCENT}}>CRED</span>
			</div>
		</FadeUp>
		<HorizontalLine delay={20} />
		<FadeUp delay={30}>
			<div style={{
				fontFamily: 'Arial, sans-serif',
				fontSize: 28,
				color: 'rgba(255,255,255,0.7)',
				letterSpacing: 6,
				textTransform: 'uppercase',
			}}>
				We Make Creators Go Viral
			</div>
		</FadeUp>
	</AbsoluteFill>
);

// Scene 2: Services (90-210 frames)
const services = [
	{icon: '✂️', label: 'Short-Form Clipping'},
	{icon: '📱', label: 'Content Repurposing'},
	{icon: '🚀', label: 'Viral Optimization'},
];

const SceneServices: React.FC = () => (
	<AbsoluteFill style={{background: BG, justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 16}}>
		<Glow />
		<FadeUp delay={5}>
			<div style={{
				fontFamily: 'Arial, sans-serif',
				fontSize: 22,
				color: ACCENT,
				letterSpacing: 6,
				textTransform: 'uppercase',
				marginBottom: 24,
			}}>
				What We Do
			</div>
		</FadeUp>
		{services.map((s, i) => (
			<FadeUp key={s.label} delay={15 + i * 20}>
				<div style={{
					display: 'flex',
					alignItems: 'center',
					gap: 24,
					background: 'rgba(255,255,255,0.04)',
					border: `1px solid rgba(0,240,255,0.15)`,
					borderRadius: 12,
					padding: '20px 48px',
					width: 560,
				}}>
					<span style={{fontSize: 36}}>{s.icon}</span>
					<span style={{
						fontFamily: 'Arial, sans-serif',
						fontSize: 28,
						color: '#fff',
						fontWeight: 600,
					}}>
						{s.label}
					</span>
				</div>
			</FadeUp>
		))}
	</AbsoluteFill>
);

// Scene 3: CTA (210-300 frames)
const SceneCTA: React.FC = () => {
	const frame = useCurrentFrame();
	const blink = Math.floor(frame / 20) % 2 === 0;
	return (
		<AbsoluteFill style={{background: BG, justifyContent: 'center', alignItems: 'center', flexDirection: 'column'}}>
			<Glow />
			<FadeUp delay={5}>
				<div style={{
					fontFamily: '"Arial Black", sans-serif',
					fontSize: 52,
					fontWeight: 900,
					color: '#fff',
					textAlign: 'center',
					marginBottom: 24,
				}}>
					Ready to Go Viral?
				</div>
			</FadeUp>
			<FadeUp delay={20}>
				<div style={{
					fontFamily: 'Arial, sans-serif',
					fontSize: 28,
					color: 'rgba(255,255,255,0.6)',
					textAlign: 'center',
					marginBottom: 48,
				}}>
					DM us or visit <span style={{color: ACCENT}}>contentcred.com</span>
				</div>
			</FadeUp>
			<FadeUp delay={35}>
				<div style={{
					fontFamily: '"Arial Black", sans-serif',
					fontSize: 22,
					letterSpacing: 4,
					textTransform: 'uppercase',
					color: BG,
					background: ACCENT,
					padding: '18px 56px',
					borderRadius: 8,
					boxShadow: `0 0 40px rgba(0,240,255,${blink ? 0.6 : 0.3})`,
					transition: 'box-shadow 0.2s',
				}}>
					Book a Free Call
				</div>
			</FadeUp>
		</AbsoluteFill>
	);
};

export const MyComposition: React.FC = () => (
	<AbsoluteFill style={{background: BG}}>
		<Sequence from={0} durationInFrames={90}><SceneIntro /></Sequence>
		<Sequence from={90} durationInFrames={120}><SceneServices /></Sequence>
		<Sequence from={210} durationInFrames={90}><SceneCTA /></Sequence>
	</AbsoluteFill>
);
