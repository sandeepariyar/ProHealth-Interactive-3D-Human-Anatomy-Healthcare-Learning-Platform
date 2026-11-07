# Implementation update — Real human atlas integration

The procedural mannequin, sphere/cone heart, icosahedron brain, and faux vertebrae have been removed from the **live `BodyAtlas` scene**. It now invokes the Z-Anatomy anatomy importer with seven aligned Draco-compressed GLBs, runtime fallback URLs, automatic postinstall caching, and SHA-1 Git-blob validation for model binaries.

The seven models are **not bundled in this ZIP**, due to binary download restrictions in this build environment. `npm install` automatically fetches the files into `public/models/z-anatomy/` on the user's connected computer. `npm run assets:verify` checks all seven expected blobs. Real anatomical geometry is never replaced by procedural figures.

The atlas is educational/reference geometry, not a real clinical reconstruction. Source: https://github.com/nqwrc/3d-anatomy; models are CC BY-NC-SA 4.0 as a combined distribution (see `public/models/NOTICE.md`).

Shader update: `src/scene/shaders.ts` now implements art-directed spectral tissue response, dual-lobe specular, detail-noise, surface ghosting and a stylized flow sweep. Motion: geometry-derived focus positions in one coherent body coordinate system with GSAP camera travel.

---

# ProHealth Next · Research-backed engineering direction

**Research date:** 5 November 2026  
**Project state:** First React + R3F / WebGL2 / GLSL milestone implemented. End-to-end browser and npm build NOT verified in the offline authoring environment.

## Product concept

**ProHealth Next** is a high-fidelity *anatomical visualization* research prototype: a single 3D body reference with independently controllable anatomical systems, a motion-led spatial navigation model, contextual patient-style reference data, and distinctive materials. It is **not** a diagnosis engine, a medical device or a real medical record system. The reference data is simulated.

### UX principles

1. The selected anatomy occupies the majority of attention. Data is contextual and never all exposed simultaneously.
2. All interactions have visible state changes. Organ selection moves the camera *through* the body, not between disconnected pages.
3. Every visual effect has a function: translucency exposes structure; rim lighting clarifies silhouette; motion explains spatial relationships; a flow overlay demonstrates a render technique without claiming physiological measurement.
4. Keep an explicit reduced-motion preference, plus follow `prefers-reduced-motion` on first load. Avoid unrequested auto-rotation.
5. No inaccessible tiny must-read clinical text; micro-labels belong only to decorative/demo scene metadata, not primary controls.
6. Use contextual right panel and bottom dock instead of the previous long multi-column card stack.

## Rendering engine research

### Recommended now: React 19 + React Three Fiber v9 + Three.js WebGL2

Three.js docs state WebGPURenderer is the **future direction** and offers a WebGL2 fallback and a node/TSL shading system. They also explicitly say its implementation is still experimental, and normal GLSL `ShaderMaterial` is not supported by WebGPURenderer. A reliable first milestone should therefore use WebGL2 for custom GLSL materials and move to WebGPU/TSL only after feature parity tests. Sources:

- https://threejs.org/manual/pages/webgpurenderer
- https://threejs.org/manual/pages/webgpu-postprocessing.html
- https://threejs.org/docs/pages/TSL
- https://r3f.docs.pmnd.rs/getting-started/introduction

### High-end shader plan

**Included in this milestone:**
- Micro-noise-based anatomical surface treatment (procedural detail).
- Fresnel/edge translucency approximation (not biological subsurface scattering).
- Separately tintable tissue and bronchial tree.
- Time-based shader uniforms / stylized flow blending.
- Surface silhouette scanner shader with tunable visibility.
- N8AO, selective bright bloom and vignette in a composed WebGL2 pipeline.
- Smooth material-mode changes, independent of camera changes.

**Next render milestones:**
- Switch to PBR-compatible custom material layering on imported high-resolution organs, preserving correct tangent-space normal maps and physically plausible lighting. Custom raw shader currently sacrifices some physically based material features for portability.
- Add controlled transmission/volume absorption instead of heavily transparent surface layering; compare to real SSS solutions and benchmark across GPUs.
- Implement *separate* organ selection-outline pass; keep highlights restrained.
- Add clip-plane / section mode with correct interior caps, per-structure depth sorting and readable silhouettes.
- Optional multi-view mode with reference CT or other images only when files genuinely correspond to the 3D structure.
- GPU performance telemetry; resolution adaptation under load.
- Re-evaluate WebGPU/TSL when performance and support meet production requirements.

Useful official documentation:
- https://react-postprocessing.docs.pmnd.rs/introduction
- https://react-postprocessing.docs.pmnd.rs/passes/n8ao
- https://react-postprocessing.docs.pmnd.rs/effects/bloom

### Asset sourcing: source quality and licence checks

**BodyParts3D**: detailed reference adult male anatomy. The current licence is CC BY 4.0 with attribution. Good for many independent anatomical structures, but raw meshes require alignment, naming, mesh cleanup and optimization.

- https://dbarchive.biosciencedbc.jp/en/bodyparts3d/desc.html
- https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html
- https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html

**HuBMAP Human Reference Atlas (HRA)**: artist-developed reference organs validated by specialists for anatomical reference. Modern united model datasets are very large. An openly accessible male body atlas (`united-male/v1.10`) is reportedly ~230 MB unoptimized; importing it directly is NOT a good strategy for a fast user-facing application. Use a content pipeline to segment, decimate carefully, preserve positioning/metadata, and compress. Model provenance and dataset version must be recorded alongside each GLB. Example downloadable source:

- https://humanatlas.io/3d-reference-library
- https://cdn.humanatlas.io/digital-objects/ref-organ/united-male/v1.10/assets/3d-vh-m-united.glb
- https://humanatlas.io/assets/content/3d-reference-library-page/data.yaml

**Z-Anatomy** has a rich atlas, but CC BY-SA 4.0 derivative-share-alike obligations and some included third-party components require closer attention. Avoid using it by default in an unrestricted commercial product until the asset-specific licences have been checked.

- https://www.spi-inc.org/projects/z-anatomy/
- https://ana3d.app/en/sources-and-licences/

**Available reference implementation**: packed BodyParts3D geometry with 2,200+ independent meshes and ~33 MB of compressed data demonstrates that a coherent browser-ready body atlas is feasible, but its prepacked batches and per-structure metadata need independent evaluation before using in this project.

- https://github.com/ashemag/human-atlas

**Former lung asset (removed in current version)**: the old HuBMAP-style `lung-male.glb` from the earlier ZIP is no longer rendered or bundled. ProHealth now loads Z-Anatomy aligned skeletal/muscular/visceral/cardiovascular/nervous/joints/lymphatic systems with a license notice and automated installation.

### Proposed atlas folder structure

```
public/models/atlas/
  atlas-manifest.json       # attribution + coordinate units + node ontology IDs
  body-surface.opt.glb      # optimized skin reference
  skeleton.opt.glb
  respiratory.opt.glb
  cardiovascular.opt.glb
  nervous.opt.glb
  gastro.opt.glb
```

Keep the anatomical shared coordinate origin fixed. **Do not individually recenter organ models**, except when rendering an optional isolated teaching preview. Camera focus targets should derive from target structure bounds, while authored offsets make composition intentional.

### Asset optimization workflow

1. Download legitimate reference atlas with source/version/attribution info.
2. Split into systems while retaining original transforms and ontology ID mapping.
3. Inspect mesh triangle counts, draw calls, normal/tangent consistency, bounds and overall scale.
4. Simplify with a visual error budget; keep important anatomical landmarks, boundaries, fine bronchi and bone features.
5. Repack with glTF Transform; optimize geometry and textures, use appropriate GPU texture compression if warranted.
6. Validate that picking still returns stable structure IDs and all layers remain aligned.
7. Test on average laptop integrated GPUs, then scale resolution and LOD until interaction is fluid.

Docs: https://gltf-transform.dev/ and https://threejs.org/docs/pages/GLTFLoader.html

Example CLI (install tool on development machine):

```bash
npm install --global @gltf-transform/cli
# Only after models are aligned and structure ID integrity is checked:
gltf-transform optimize input.glb output.optimized.glb --texture-compress webp
```

### Motion language

The design intentionally uses **different motion classes**, not one animation for everything:

| Interaction | Animation | Intended feeling |
|---|---|---|
| Organs changed | Camera spline/eased dolly and pivot | Spatial continuity |
| Context changes | Fade + short vertical drift + soft deblur | Relationship with 3D focus |
| Selected organ dock item | Shared spring-highlight with scale feedback | Direct manipulation |
| Rail tab change | Shared selection indicator + button spring | Wayfinding |
| Layer toggle | Immediate display + soft visibility fade | Surface peeling |
| Shader mode | Uniform interpolation over frames | Material transformation |
| Insight details | Expand and shrink | Progressive disclosure |
| Settings | Spring-in overlay | Controlled secondary context |

Use the GSAP camera director for movements and Motion (React) for UI springs. Reduced motion should disable non-essential movement. Reference: https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions

### UI scale and data density

- A single primary stage dominates the layout; avoid cluttered side panels.
- No constant pulsing/neon on every widget.
- Reserve cyan for selection/interaction, warmer colors for organ interpretation.
- Keep header, stage controls, organ dock and one insights panel as the initial information hierarchy.
- Stage supports desktop then tablet layout; keyboard focus and contrast need accessibility audit.

### Quality and performance acceptance (engineering targets, not benchmark claims)

- Desktop target: ~60 FPS on mainstream midrange GPU at 1080p; graceful fallback where impossible.
- First meaningful stage within 3 seconds on a normal connection after initial cache (requires measurement).
- Max compressed geometry per streamed system: target 10–20 MB, with lazy loading; final budgets subject to visual QA.
- Render body and selected organ as separate layers; avoid 1000 mesh draw calls by scene batching while keeping stable picking metadata.
- Camera and material transitions remain smooth across user input; cancel or retarget previous tweens.
- Maintain material disposal and prevent shader leaking across navigation.
- Cross-browser WebGL2 test on Chrome, Edge, Firefox, Safari.
- Verify accessibility (keyboard, reduced motion, scalable meaningful text) and factual accuracy with clinical reviewers for any real deployment.

## Milestones

### M1 — Working engine and minimal workstation (this ZIP)
- [x] Clean React source
- [x] New minimal UI architecture
- [x] Real HRA-style lungs GLB included
- [x] Shared body coordinate stage and focus camera targets
- [x] Surface / skeleton / organ layers
- [x] Three visual shader modes with animated uniforms
- [x] GSAP and Motion interactions
- [x] N8AO / bloom / vignette integration
- [ ] Actual npm build + browser interaction QA (offline tool limitation)
- [ ] Genuine full-body asset imported and validated

### M2 — Actual reference human atlas
- [ ] Import male atlas with skin/skeleton/organs sharing one source-space transform
- [ ] Replace all schematic brain, heart, vertebrae geometry
- [ ] Align viewer focus and raycasting to named mesh bounds
- [ ] Mesh metadata, proper attributions, streaming & LOD

### M3 — Rendering art direction
- [ ] Advanced surface/SSS material, vascular emphasis masks, cross section
- [ ] Lighting look-development presets, physically informed tinting
- [ ] Anatomy-specific render targets and measured GPU profiling

### M4 — Interaction engineering
- [ ] Anatomical hit testing and hover, context labels
- [ ] Reversible user-controlled smooth camera transition retargeting
- [ ] Timeline/scrubber, state-driven panels, reduced motion QA
- [ ] Responsive tablet interaction and multi-touch

### M5 — Clinical data integration (separate scoped investigation)
- [ ] Clinician interviews, documented user tasks and real usability research
- [ ] Explicit intended use, data validation, risk analysis
- [ ] Privacy, authentication, interoperability (FHIR if appropriate)
- [ ] MDR qualification assessment **before** positioning the product as medical software

**Regulatory note:** EU/MDCG guidance depends on the software's intended medical purpose. Never infer that including demo health metrics alone makes the application clinically validated. Source: https://health.ec.europa.eu/medical-devices-sector/new-regulations/guidance-mdcg-endorsed-documents-and-other-guidance_en
