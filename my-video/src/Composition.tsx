import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Sequence, Img} from 'remotion';

const ACCENT = '#00f0ff';
const BG = '#0a0a0a';

const gdrive = (id: string) => `https://drive.google.com/uc?export=view&id=${id}`;

const ASSETS = {
	manLaptop: gdrive('1SCsDmFgx9oJBpqW4gefHQ4A-kbZQ4epI'),
	redCarpet: gdrive('1F91DmkGMgE5JKjlNGV89FmROIj43TJnO'),
	redCarpet2: gdrive('1eHBD-GhTyKxXI4hQ4jLB7d8J0rfnGJcK'),
	bigYoutuber: gdrive('1FpknmBZmCasVP860X6Xi1xUzLsObe8DY'),
	thumbsUp: gdrive('1Ui2u37GOYZm2R8oJFJUesV9MPBnt7NbW'),
	manWithMoney: gdrive('1nFDa9Tg2Ly8HhypRFEMQ1m5sasJB-Uhq'),
	livingRoom: gdrive('1Br72Rm4dq-FMhMarSqDlv8u2cBcZitnB'),
	winMan: gdrive('1fPZ7zUpXnPYW07XMcN2sQtpygdMHXMLn'),
};

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

const FadeIn: React.FC<{delay?: number; children: React.ReactNode}> = ({delay = 0, children}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const progress = spring({frame: frame - delay, fps, config: {damping: 20, stiffness: 60}});
	return (
		<div style={{opacity: interpolate(progress, [0, 1], [0, 1])}}>
			{children}
		</div>
	);
};

const Glow: React.FC<{x?: string; y?: string}> = ({x = '50%', y = '50%'}) => {
	const frame = useCurrentFrame();
	const pulse = Math.sin(frame / 30) * 0.15 + 0.85;
	return (
		<div style={{
			position: 'absolute',
			top: y,
			left: x,
			transform: 'translate(-50%, -50%)',
			width: 900,
			height: 900,
			borderRadius: '50%',
			background: `radial-gradient(circle, rgba(0,240,255,${0.07 * pulse}) 0%, transparent 70%)`,
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
			width: interpolate(progress, [0, 1], [0, 360]),
			height: 2,
			background: `linear-gradient(90deg, ${ACCENT}, transparent)`,
			margin: '16px 0',
		}} />
	);
};

// Scene 1: Agency intro with man on laptop (0–90 frames)
const SceneIntro: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const imgProgress = spring({frame: frame - 10, fps, config: {damping: 22, stiffness: 50}});

	return (
		<AbsoluteFill style={{background: BG, overflow: 'hidden'}}>
			{/* Background living room */}
			<AbsoluteFill>
				<Img
					src={ASSETS.livingRoom}
					style={{width: '100%', height: '100%', objectFit: 'cover', opacity: 0.15}}
				/>
			</AbsoluteFill>
			<Glow x="30%" y="50%" />

			{/* Man on laptop — right side */}
			<FadeIn delay={10}>
				<div style={{
					position: 'absolute',
					right: -40,
					bottom: 0,
					height: '90%',
					opacity: interpolate(imgProgress, [0, 1], [0, 0.95]),
					transform: `translateX(${interpolate(imgProgress, [0, 1], [120, 0])}px)`,
				}}>
					<Img
						src={ASSETS.manLaptop}
						style={{height: '100%', objectFit: 'contain'}}
					/>
				</div>
			</FadeIn>

			{/* Text — left side */}
			<div style={{
				position: 'absolute',
				left: 120,
				top: '50%',
				transform: 'translateY(-50%)',
				display: 'flex',
				flexDirection: 'column',
			}}>
				<FadeUp delay={5}>
					<div style={{
						fontFamily: '"Arial Black", sans-serif',
						fontSize: 100,
						fontWeight: 900,
						color: '#fff',
						letterSpacing: 6,
						textTransform: 'uppercase',
						textShadow: `0 0 50px rgba(0,240,255,0.35)`,
						lineHeight: 1,
					}}>
						CONTENT<br /><span style={{color: ACCENT}}>CRED</span>
					</div>
				</FadeUp>
				<HorizontalLine delay={20} />
				<FadeUp delay={30}>
					<div style={{
						fontFamily: 'Arial, sans-serif',
						fontSize: 24,
						color: 'rgba(255,255,255,0.65)',
						letterSpacing: 5,
						textTransform: 'uppercase',
					}}>
						We Make Creators Go Viral
					</div>
				</FadeUp>
			</div>
		</AbsoluteFill>
	);
};

// Scene 2: Services with red carpet & big youtuber (90–210 frames)
const services = [
	{label: 'Short-Form Clipping', desc: 'Turn long videos into viral clips'},
	{label: 'Content Repurposing', desc: 'Maximize every piece of content'},
	{label: 'Viral Optimization', desc: 'Hooks that make people stop scrolling'},
];

const SceneServices: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const imgProgress = spring({frame: frame - 5, fps, config: {damping: 22, stiffness: 50}});

	return (
		<AbsoluteFill style={{background: BG, overflow: 'hidden'}}>
			{/* Red carpet background asset */}
			<div style={{
				position: 'absolute',
				left: -60,
				bottom: 0,
				height: '85%',
				opacity: interpolate(imgProgress, [0, 1], [0, 0.7]),
				transform: `translateX(${interpolate(imgProgress, [0, 1], [-80, 0])}px)`,
			}}>
				<Img src={ASSETS.redCarpet2} style={{height: '100%', objectFit: 'contain'}} />
			</div>

			<Glow x="70%" y="45%" />

			{/* Big youtuber — far right */}
			<div style={{
				position: 'absolute',
				right: -20,
				bottom: 0,
				height: '80%',
				opacity: interpolate(imgProgress, [0, 1], [0, 0.85]),
				transform: `translateX(${interpolate(imgProgress, [0, 1], [100, 0])}px)`,
			}}>
				<Img src={ASSETS.bigYoutuber} style={{height: '100%', objectFit: 'contain'}} />
			</div>

			{/* Services list — center/right */}
			<div style={{
				position: 'absolute',
				right: 280,
				top: '50%',
				transform: 'translateY(-50%)',
				display: 'flex',
				flexDirection: 'column',
				gap: 18,
			}}>
				<FadeUp delay={5}>
					<div style={{
						fontFamily: 'Arial, sans-serif',
						fontSize: 18,
						color: ACCENT,
						letterSpacing: 6,
						textTransform: 'uppercase',
						marginBottom: 8,
					}}>
						What We Do
					</div>
				</FadeUp>
				{services.map((s, i) => (
					<FadeUp key={s.label} delay={15 + i * 18}>
						<div style={{
							background: 'rgba(0,0,0,0.6)',
							border: `1px solid rgba(0,240,255,0.2)`,
							borderLeft: `3px solid ${ACCENT}`,
							borderRadius: 8,
							padding: '16px 28px',
							width: 480,
							backdropFilter: 'blur(8px)',
						}}>
							<div style={{
								fontFamily: '"Arial Black", sans-serif',
								fontSize: 22,
								color: '#fff',
								fontWeight: 800,
							}}>
								{s.label}
							</div>
							<div style={{
								fontFamily: 'Arial, sans-serif',
								fontSize: 15,
								color: 'rgba(255,255,255,0.5)',
								marginTop: 4,
							}}>
								{s.desc}
							</div>
						</div>
					</FadeUp>
				))}
			</div>
		</AbsoluteFill>
	);
};

// Scene 3: CTA with win man & thumbs up (210–300 frames)
const SceneCTA: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const blink = Math.floor(frame / 20) % 2 === 0;
	const imgProgress = spring({frame: frame - 5, fps, config: {damping: 22, stiffness: 50}});

	return (
		<AbsoluteFill style={{background: BG, overflow: 'hidden'}}>
			<Glow x="50%" y="50%" />

			{/* Win man — left */}
			<div style={{
				position: 'absolute',
				left: -30,
				bottom: 0,
				height: '85%',
				opacity: interpolate(imgProgress, [0, 1], [0, 0.9]),
				transform: `translateX(${interpolate(imgProgress, [0, 1], [-100, 0])}px)`,
			}}>
				<Img src={ASSETS.winMan} style={{height: '100%', objectFit: 'contain'}} />
			</div>

			{/* Thumbs up — right */}
			<div style={{
				position: 'absolute',
				right: 40,
				bottom: 0,
				height: '75%',
				opacity: interpolate(imgProgress, [0, 1], [0, 0.85]),
				transform: `translateX(${interpolate(imgProgress, [0, 1], [100, 0])}px)`,
			}}>
				<Img src={ASSETS.thumbsUp} style={{height: '100%', objectFit: 'contain'}} />
			</div>

			{/* CTA text — center */}
			<div style={{
				position: 'absolute',
				left: '50%',
				top: '50%',
				transform: 'translate(-50%, -50%)',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				zIndex: 10,
			}}>
				<FadeUp delay={5}>
					<div style={{
						fontFamily: '"Arial Black", sans-serif',
						fontSize: 58,
						fontWeight: 900,
						color: '#fff',
						textAlign: 'center',
						textShadow: `0 0 40px rgba(0,0,0,0.8)`,
						whiteSpace: 'nowrap',
					}}>
						Ready to Go Viral?
					</div>
				</FadeUp>
				<FadeUp delay={18}>
					<div style={{
						fontFamily: 'Arial, sans-serif',
						fontSize: 24,
						color: 'rgba(255,255,255,0.65)',
						textAlign: 'center',
						margin: '16px 0 36px',
					}}>
						DM us or visit{' '}
						<span style={{color: ACCENT, fontWeight: 700}}>contentcred.com</span>
					</div>
				</FadeUp>
				<FadeUp delay={32}>
					<div style={{
						fontFamily: '"Arial Black", sans-serif',
						fontSize: 22,
						letterSpacing: 4,
						textTransform: 'uppercase',
						color: BG,
						background: ACCENT,
						padding: '18px 64px',
						borderRadius: 8,
						boxShadow: `0 0 48px rgba(0,240,255,${blink ? 0.7 : 0.3})`,
					}}>
						Book a Free Call
					</div>
				</FadeUp>
			</div>
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
