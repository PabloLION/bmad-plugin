# ffmpeg motion recipes

Reusable motion primitives for simple moves: a graphic that flies in, holds, and flies out, and an infographic that builds in stages. Each recipe is one deterministic ffmpeg invocation from finished still PNGs to a ProRes 4444 alpha overlay, so prefer these before invoking an engine workspace or the full design-prompting loop when the beat needs nothing more than entrance, hold, and exit.

The input stills come from wherever the graphic was authored: `{skill-root}/scripts/html_to_png.py` renders (exact-size, alpha verified), `snug_frame.py` framed photos, or any exported PNG that carries real alpha.

## Shared rules

- Input PNGs must carry real alpha. A PNG whose alpha channel is all zero or all opaque full-frame produces an invisible or frame-covering overlay; `html_to_png.py` verifies this at export.
- Every `overlay` filter in these recipes passes `format=auto`. The overlay filter's default working format is `yuv420`, which silently drops alpha; the encoder then re-adds a fully opaque alpha plane and the "overlay" covers the whole frame.
- The filtergraph ends with `format=yuva444p10le` before `prores_ks`, and the output is always ProRes 4444 (`-c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le`), per this skill's deliverable rule.
- Parameters come from the project, never from these recipes: canvas size and fps from the format profile, the beat duration and timeline position from the approved beat table, motion durations and easing feel from the `tokens.json` motion values and the Production Bible. Timing is law; a move that wants a longer beat routes back through the creator.
- Easing uses cubic curves in the overlay position expression: ease-out is `1-pow(1-p,3)` and ease-in is `pow(p,3)`, where `p` is the normalized progress `(t-start)/dur` of that move.
- Verify every render with `render_verify.py` before calling it done (see the last section).

## Recipe 1: fly-in, hold, fly-out

One still PNG slides in from off-screen with an ease-out, holds at its rest position, then accelerates off-screen with an ease-in. Optional whoosh: see recipe 3.

Parameters: `{W}x{H}` and `{fps}` from the format profile, `{dur}` the beat duration in seconds, `{in}` and `{out}` the entrance and exit durations in seconds (map them to the tokens motion durations), `{X}` and `{Y}` the rest position of the PNG's top-left corner, `{hold-end} = {dur} - {out}`.

```bash
ffmpeg -y \
  -f lavfi -i "color=c=black@0.0:s={W}x{H}:r={fps},format=rgba" \
  -loop 1 -i graphic.png \
  -filter_complex "[1]format=rgba[g];[0][g]overlay=format=auto:x='if(lt(t,{in}), -w+({X}+w)*(1-pow(1-t/{in},3)), if(lt(t,{hold-end}), {X}, {X}+(W-{X})*pow((t-{hold-end})/{out},3)))':y={Y},format=yuva444p10le" \
  -t {dur} -r {fps} -c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le graphics/<beat-id>.mov
```

Worked example, validated end to end (1920x1080 at 30 fps, 4.5 s beat, 0.6 s fly-in from the left, 0.4 s fly-out to the right, rest at 120,780):

```bash
ffmpeg -y \
  -f lavfi -i "color=c=black@0.0:s=1920x1080:r=30,format=rgba" \
  -loop 1 -i graphic.png \
  -filter_complex "[1]format=rgba[g];[0][g]overlay=format=auto:x='if(lt(t,0.6), -w+(120+w)*(1-pow(1-t/0.6,3)), if(lt(t,4.1), 120, 120+(W-120)*pow((t-4.1)/0.4,3)))':y=780,format=yuva444p10le" \
  -t 4.5 -r 30 -c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le graphics/<beat-id>.mov
```

Reading the x expression: before `{in}` the PNG travels from fully off-screen left (`-w`) to `{X}` on an ease-out; until `{hold-end}` it rests at `{X}`; then it accelerates to `W` (off-screen right) on an ease-in. Frame 0 is fully transparent because the graphic starts entirely off-canvas.

Variants:

- Fly in from the right: swap the entrance target arithmetic, `x='if(lt(t,{in}), W-(W-{X})*(1-pow(1-t/{in},3)), ...)'`.
- Vertical moves: put the motion expression on `y` and fix `x`, entering from `-h` (top) or `H` (bottom).
- Enter and exit on the same side: reuse the entrance arithmetic with the ease-in curve for the exit.
- Hold to a hard cut: drop the third branch and let the graphic rest until `{dur}` ends.

## Recipe 2: staged infographic build

An infographic that assembles as the speaker names each part, one reveal per anchor word from the beat table. Author one full-canvas transparent PNG per stage (`layer-01.png`, `layer-02.png`, ...), each containing only its new elements already at final position. Each layer fades in over 0.3 s at its anchor while easing up 24 px, and everything holds once built.

Parameters per layer `k`: `{Tk}` the layer's anchor time in seconds measured from the beat's start (anchor ts minus beat start, from the approved beat table).

Worked example, validated end to end (three layers at 1.2 s, 4.8 s, 8.1 s inside a 12 s beat, 1920x1080 at 30 fps):

```bash
ffmpeg -y \
  -f lavfi -i "color=c=black@0.0:s=1920x1080:r=30,format=rgba" \
  -loop 1 -i layer-01.png -loop 1 -i layer-02.png -loop 1 -i layer-03.png \
  -filter_complex "[1]format=rgba,fade=t=in:st=1.2:d=0.3:alpha=1[l1];[2]format=rgba,fade=t=in:st=4.8:d=0.3:alpha=1[l2];[3]format=rgba,fade=t=in:st=8.1:d=0.3:alpha=1[l3];[0][l1]overlay=format=auto:x=0:y='if(lt(t,1.2),24,if(lt(t,1.5),24*pow(1-(t-1.2)/0.3,3),0))'[v1];[v1][l2]overlay=format=auto:x=0:y='if(lt(t,4.8),24,if(lt(t,5.1),24*pow(1-(t-4.8)/0.3,3),0))'[v2];[v2][l3]overlay=format=auto:x=0:y='if(lt(t,8.1),24,if(lt(t,8.4),24*pow(1-(t-8.1)/0.3,3),0))',format=yuva444p10le" \
  -t 12 -r 30 -c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le graphics/<beat-id>.mov
```

Per layer, the pattern is `fade=t=in:st={Tk}:d=0.3:alpha=1` (fully transparent before its anchor, faded in 0.3 s after) plus a y expression that eases the layer from a 24 px offset to 0 over the same 0.3 s. Add or remove `[k] ... [lk]` chains and matching `overlay` links to change the layer count. Verify one extracted frame per anchor: exactly k layers visible at anchor k.

## Recipe 3: whoosh SFX sidecar

The pipeline's composited preview and final render take overlay video only, so a whoosh never gets muxed into the overlay MOV. Deliver it as a beat-length sidecar wav aligned to the overlay's own timeline, and list it in `graphics/HANDOFF.md` next to its overlay with the same timeline position, so the editor drops both at the beat start.

Parameters: `{move-start-ms}` the fly-in or reveal start within the beat in milliseconds, `{dur}` the beat duration in seconds. The whoosh source file comes from the studio's own SFX library or configured audio lane; none ships with this module.

```bash
ffmpeg -y -i whoosh.wav \
  -af "adelay={move-start-ms}|{move-start-ms},apad=whole_dur={dur}" \
  -ar 48000 -c:a pcm_s16le graphics/<beat-id>-sfx.wav
```

Validated example: a fly-in starting 1.2 s into a 12 s beat used `adelay=1200|1200,apad=whole_dur=12` and produced an exactly 12.0 s wav with the whoosh landing at 1.2 s.

## Verify before done

Every recipe output goes through the standard verification, expectations passed explicitly:

```bash
uv run {skill-root}/scripts/render_verify.py graphics/<beat-id>.mov \
  --pixfmt prores4444 --expect-dur {dur} --expect-fps {fps} --expect-res {W}x{H}
```

Then inspect the extracted checkerboard frames per the skill's rules: for recipe 1, the first frame fully transparent, the hold frame at rest position, the final frame off-screen or held per the variant; for recipe 2, exactly k layers visible at anchor k. A render without checked frames is not done.
