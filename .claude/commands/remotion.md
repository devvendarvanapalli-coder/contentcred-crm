# Remotion Video Project

Bootstrap and work with a Remotion video project using `create-video@latest`.

## Steps

1. Scaffold a new project:
   ```bash
   npx create-video@latest
   ```

2. Help the user:
   - Edit compositions in `src/`
   - Preview: `npm start`
   - Render: `npm run build`

## Common tasks

- **Add composition**: new `.tsx` in `src/`, register in `src/Root.tsx`
- **Change duration**: adjust `durationInFrames`
- **Change FPS**: adjust `fps` (default: 30)
- **Render specific**: `npx remotion render <CompositionId> out/video.mp4`
