# Portfolio — Animation System Deep Dive

This document explains every animation in the portfolio in full technical detail: the mathematics, the rendering pipeline, the interactivity, and the code architecture.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Julia Set — Main Page (WebGL)](#julia-set--main-page-webgl)
3. [Network Graph — Contact Page (Canvas 2D)](#network-graph--contact-page-canvas-2d)
4. [Fractal Tree — Projects Page (Canvas 2D)](#fractal-tree--projects-page-canvas-2d)
5. [FractalBackground — Transition System](#fractalbackground--transition-system)
6. [Hero Page — CSS Animations](#hero-page--css-animations)
7. [EdgeNav — Proximity Navigation](#edgenav--proximity-navigation)
8. [Input System — Mouse, Touch, Orientation](#input-system--mouse-touch-orientation)

---

## Architecture Overview

Each page uses a different rendering technology depending on complexity:

| Page | Renderer | Technology |
|------|----------|------------|
| `/` (Home) | Julia set fractal | WebGL 2 (GPU shaders) |
| `/contact` | Network graph | Canvas 2D (CPU) |
| `/projects` | Fractal tree | Canvas 2D (CPU) |
| `/about` | None | — |

The `FractalBackground` component manages two canvas slots (A and B) and cross-fades between them when the route changes. Pages with no background (`/about`, `/projects`) cut instantly; page transitions between two active fractals (e.g. home → contact) cross-fade over 1.5 seconds.

All fractals run inside a `requestAnimationFrame` loop and scale to `devicePixelRatio` (capped at 2×) for sharp rendering on retina screens.

---

## Julia Set — Main Page (WebGL)

**Files:** `src/fractals/julia.js`, `src/components/FractalBackground/useFractalEngine.js`

### What is a Julia Set?

A Julia set is a fractal defined in the complex plane. For each pixel, you take its complex coordinate $z = x + yi$ and repeatedly apply the map:

$$z_{n+1} = z_n^2 + c$$

where $c \in \mathbb{C}$ is a fixed complex constant. If the sequence $\{z_n\}$ stays bounded — i.e. $|z_n|$ never exceeds the escape radius — the point is *inside* the set and rendered dark. If it escapes, the number of iterations before escape is mapped to a colour. The boundary between these two regions forms the fractal, which is infinitely detailed at any zoom level.

The key difference from the **Mandelbrot set**: in the Mandelbrot set, $c$ varies per pixel and $z_0 = 0$. In the Julia set, $c$ is a *global parameter* and $z_0$ is the pixel coordinate. This means every point $c$ in the complex plane defines a different Julia set — and moving $c$ continuously changes the entire shape.

### Rendering Pipeline

The Julia set is rendered entirely on the GPU using **WebGL 2**. No CPU-side pixel manipulation is involved.

**Vertex shader** (`VERTEX_SHADER`)

A full-screen quad is drawn with two triangles (6 vertices). Instead of uploading vertex data to a buffer, the positions are baked as a constant array inside the shader and indexed via `gl_VertexID`:

```glsl
const vec2 pos[6] = vec2[6](
  vec2(-1, -1), vec2( 1, -1), vec2(-1,  1),
  vec2(-1,  1), vec2( 1, -1), vec2( 1,  1)
);
gl_Position = vec4(pos[gl_VertexID], 0.0, 1.0);
```

This covers the entire NDC (Normalized Device Coordinate) space, so the fragment shader runs once per screen pixel.

**Fragment shader** (`FRAGMENT_SHADER`)

For each pixel:

**1. Pixel → complex plane.**
The pixel coordinate $p = (p_x, p_y)$ is mapped to the initial complex value $z_0$ by centering on the canvas and scaling by the zoom level:

$$z_0 = \frac{p - r/2}{zoom} + center$$

where $r = (W, H)$ is the resolution. In GLSL:
```glsl
vec2 z = (gl_FragCoord.xy - u_resolution * 0.5) / u_zoom + u_center;
```

**2. Complex squaring.**
Julia iteration requires $z^2$. For $z = a + bi$:

$$(a + bi)^2 = (a^2 - b^2) + 2abi$$

Implemented as:
```glsl
vec2 complexMul(vec2 a, vec2 b) {
  return vec2(a.x*b.x - a.y*b.y,  a.x*b.y + a.y*b.x);
}
z = complexMul(z, z) + u_c;
```

**3. Escape condition.**
The standard escape radius is $R = 2$. Testing $|z|^2 > 4$ avoids a square root:

$$|z|^2 = a^2 + b^2 > 4 \implies |z| > 2$$

Once this is true, the sequence will diverge to infinity. This is proven by the fact that if $|z| > \max(|c|, 2)$ then $|z_{n+1}| > |z_n|$ strictly.

**4. Smooth colouring.**
Raw iteration counts produce harsh integer-step colour bands. To remove banding, a continuous escape time value is computed:

$$s = i - \log_2\bigl(\max(|z|, 1)\bigr)$$

This is a first-order approximation of the standard smooth colouring formula:

$$s = i - \log_2\!\left(\frac{\log|z|}{\log 2}\right) = i - \log_2\log_2|z|$$

The derivation: after $i$ iterations the orbit has escaped. If we could continue iterating with fractional steps, we'd need $\log_2\log_2|z|$ fewer steps to reach the bailout $|z|=2$ exactly. Subtracting this gives a real-valued iteration count that varies smoothly across the fractal boundary.

**5. Sinusoidal colour palette.**
The smooth value $s$ is mapped to RGB via three phase-offset sine waves:

$$c_k(s) = 0.5 + 0.5\sin\!\left(0.1\pi s + \phi_k\right), \quad \phi \in \{0,\ 2,\ 4\} \text{ rad}$$

```glsl
float x = t * 0.1;
vec3 color = vec3(
  0.5 + 0.5 * sin(x * PI + 0.0),   // red   φ = 0
  0.5 + 0.5 * sin(x * PI + 2.0),   // green φ = 2
  0.5 + 0.5 * sin(x * PI + 4.0)    // blue  φ = 4
);
```

The phases $(0, 2, 4)$ are evenly spaced at $2\pi/3$ radians, which ensures the three channels are always $120°$ apart — cycling through distinct hue combinations rather than all peaking at the same time. Red is damped by $\times 0.7$, green and blue are pushed toward $1.0$ to bias the palette toward cool teal/cyan. Points inside the set ($s < 0.1$) are pushed to near-black.

### Auto-Orbit (Default Animation)

When no user input is detected, the $c$ parameter traces a **Lissajous curve** through the Mandelbrot set boundary — a region where Julia sets are visually rich (neither fully filled nor empty):

$$c(t) = \Bigl(-0.4 + 0.5\cos(0.4\,t),\quad 0.1 + 0.35\sin(0.4\varphi\, t)\Bigr)$$

where $\varphi = \dfrac{1+\sqrt{5}}{2} \approx 1.618$ is the **golden ratio**.

- The real part oscillates at angular frequency $\omega_x = 0.4\ \text{rad/s}$
- The imaginary part oscillates at $\omega_y = 0.4\varphi\ \text{rad/s}$
- The ratio $\omega_x / \omega_y = 1/\varphi$ is irrational, so the orbit **never exactly repeats** — it is a quasi-periodic curve that densely fills its bounding rectangle over time
- The amplitude $[0.5, 0.35]$ sweeps $c$ through dramatically different Julia shapes: connected blobs, thin filaments, Cantor dust, and dendrites

### Mouse / Touch / Orientation Control

**Mouse mapping:**

The normalised mouse position $x_m \in [-1, 1]$ maps linearly to the real part of $c$:

$$c_{re} = 0.7\,x_m - 0.3, \qquad c_{im} = 0.45\,y_m$$

| $x_m$ | $c_{re}$ | Julia shape |
|--------|----------|-------------|
| $-1$ | $-1.0$ | Basilica — two large filled lobes |
| $0$ | $-0.3$ | Flame-like dendrites |
| $+1$ | $+0.4$ | Cantor dust (disconnected) |

**Blend mechanism (desktop only):**

A blend scalar $b \in [0, 1]$ ramps up once the mouse moves significantly ($|x_m| > 0.015$ or $|y_m| > 0.015$):

$$b_{n+1} = \min(1,\ b_n + 0.006)$$

At 60 fps this takes $1/0.006 \approx 167$ frames $\approx 2.8$ seconds to reach $b = 1$.

The target $c$ is a weighted blend of the auto-orbit and mouse positions:

$$\mathbf{c}_{target} = (1 - b)\,\mathbf{c}_{auto} + b\,\mathbf{c}_{mouse}$$

**Smooth following (exponential lerp):**

The rendered $c$ approaches the target via a first-order IIR filter (discrete exponential smoothing):

$$\mathbf{c}_{n+1} = \mathbf{c}_n + \alpha\,(\mathbf{c}_{target} - \mathbf{c}_n), \quad \alpha = 0.1$$

This is equivalent to $\mathbf{c}_n = \mathbf{c}_{target} + (\mathbf{c}_0 - \mathbf{c}_{target})(1-\alpha)^n$, meaning the error decays exponentially by $90\%$ per frame. It gives a smooth, slightly laggy follow — the fractal trails the cursor organically.

**Mobile:** $b$ is set to $1$ immediately — no ramp-up. Touch drag and device tilt drive $\mathbf{c}_{target}$ directly.

### WebGL Setup

`createQuadVAO` creates a VAO with no buffer bound — the vertex shader generates all geometry from `gl_VertexID`. A single `gl.drawArrays(gl.TRIANGLES, 0, 6)` call renders the entire screen.

Uniforms passed each frame:
- `u_resolution` — canvas dimensions in physical pixels
- `u_center` — pan offset (fixed at $(0, 0)$)
- `u_zoom` — $\min(W, H) / 4$, keeping the fractal consistently sized across aspect ratios
- `u_c` — the complex constant $c$ driving the Julia shape
- `u_maxIter` — 256 iterations

---

## Network Graph — Contact Page (Canvas 2D)

**File:** `src/fractals/networkGraph.js`

### Node Generation

70 nodes are generated using the **Mulberry32** seeded PRNG with seed `42`. Using a seeded RNG means the graph is identical across every render and screen size — positions are normalized to $[6\%, 94\%]$ of canvas dimensions so they scale with the viewport. Each node has a position $(x_i, y_i)$, a base radius $r_i \in [2, 5]$ px, and a phase $\phi_i \in [0, 2\pi)$.

### Edge Generation

An edge exists between nodes $i$ and $j$ when their Euclidean distance is below a threshold:

$$d_{ij} = \sqrt{(x_i - x_j)^2 + (y_i - y_j)^2} < d_{max}, \quad d_{max} = 0.2\min(W, H)$$

Edges are sorted by distance shortest-first. A closeness value $\kappa = 1 - d_{ij}/d_{max} \in [0,1]$ determines base stroke weight.

### Progressive Reveal

When navigating to the contact page, $p$ ramps from $0 \to 1$ over 4 seconds. The reveal is staggered so nodes appear before edges:

$$\text{visibleNodes} = \left\lfloor N \cdot \min\!\left(\frac{p}{0.5},\ 1\right) \right\rfloor$$

$$\text{visibleEdges} = \left\lfloor E \cdot \max\!\left(0,\ \frac{p - 0.25}{0.75}\right) \right\rfloor$$

Nodes fully reveal by $p = 0.5$ (2 s). Edges start appearing at $p = 0.25$ (1 s) and finish at $p = 1$ (4 s), creating a staggered build-up.

### Mouse Reactivity

The normalised mouse position $[-1, 1]$ is converted to canvas pixel space. Note the Y-axis flip — WebGL convention has $+y$ pointing up, Canvas has $+y$ pointing down:

$$m_x = \left(\frac{x_m + 1}{2}\right) W, \qquad m_y = \left(\frac{1 - y_m}{2}\right) H$$

Each node $i$ within cursor reach $r_c = 0.28\min(W,H)$ gets a proximity influence:

$$\mathrm{inf}_i = \max\!\left(0,\ 1 - \frac{d(m, p_i)}{r_c}\right) \in [0, 1]$$

Influence modulates visual properties continuously:

- **Edge opacity:** $\alpha_{ij} = \min\!\bigl(0.95,\ (0.15 + 0.3\kappa_{ij})(1 + 2.5\,\mathrm{inf}_{ij})\bigr)$, where $\mathrm{inf}_{ij} = \max(\mathrm{inf}_i, \mathrm{inf}_j)$
- **Edge width:** $w_{ij} = 0.8 + 1.5\kappa_{ij} + 2.5\,\mathrm{inf}_{ij}$
- **Node radius:** $r_i(t) = r_{0,i} + 0.4\sin(1.4t + \phi_i) + \mathrm{inf}_i \cdot r_{0,i} \cdot 1.8$

### Node Pulse

Each node pulses sinusoidally with a unique phase:

$$r_i(t) = r_{0,i} + A\sin(\omega t + \phi_i), \quad A = 0.4,\quad \omega = 1.4\ \text{rad/s}$$

The cursor node pulses faster at $\omega = 3\ \text{rad/s}$ to feel more energetic.

---

## Fractal Tree — Projects Page (Canvas 2D)

**File:** `src/components/Projects/FractalTree.jsx`

### Tree Structure

The tree is built once per canvas size by `buildTree()` using a seeded RNG (seed `7331`) for deterministic layout. It has 3 depth levels:

```
Depth 0: Trunk (1 node)
Depth 1: Category branches (3 nodes) — each mapped to a project category
Depth 2: Project leaves (9 nodes) — each mapped to a specific project
```

**Branch geometry parameters:**
- $n_k = 3$ children per node at each depth $k \in \{0, 1\}$
- Spread angles: $S_0 = 0.44\pi,\quad S_1 = 0.34\pi$ radians
- Length scale factors: $\lambda_0 = 0.65,\quad \lambda_1 = 0.70$
- Angle jitter: $\delta\theta \sim \mathcal{U}(-0.14, 0.14)$ rad (uniform random)

**Trunk dimensions:**
- Base position: $(W/2,\; 0.93H)$
- Trunk length: $L_0 = 0.27H$

### Branch Geometry

The endpoint of each branch is computed trigonometrically. Given a start point $(x_s, y_s)$, angle $\theta$, and length $L$:

$$x_e = x_s + L\cos\theta, \qquad y_e = y_s + L\sin\theta$$

Child branch angles are evenly distributed within the spread, plus a random jitter:

$$\theta_i = \theta_{parent} + \delta\theta - \frac{S}{2} + \frac{S}{n-1}\cdot i, \quad i = 0,\ldots,n-1$$

Child branch length scales geometrically with depth:

$$L_{d+1} = \lambda_d \cdot L_d \implies L_d = L_0 \prod_{k=0}^{d-1} \lambda_k$$

### Branch Rendering

Branches are drawn as **quadratic Bézier curves**, giving them a natural bow. A quadratic Bézier from $P_0$ to $P_2$ with control point $P_1$ is:

$$B(u) = (1-u)^2 P_0 + 2u(1-u) P_1 + u^2 P_2, \quad u \in [0,1]$$

The control point is placed at the branch midpoint, displaced perpendicularly by a bow amount:

$$P_1 = \frac{P_0 + P_2}{2} + bow \cdot \hat{n}, \qquad \hat{n} = \begin{pmatrix}-\sin\theta \\ \cos\theta\end{pmatrix}$$

where $\hat{n}$ is the unit normal to the branch direction and:

$$bow = 0.18L\bigl(\text{sway} + 0.28\sin(0.35t + \phi)\bigr)$$

**Colour gradient** — warm dark teal at trunk → bright cyan at tips. With $tc = d/(D-1) \in [0,1]$:

$$r(tc) = \lfloor 55(1 - tc) \rfloor, \quad g(tc) = \lfloor 115 + 130\,tc \rfloor, \quad b(tc) = \lfloor 85 + 127\,tc \rfloor$$
$$\alpha(tc) = 0.38 + 0.42\,tc$$

At the trunk ($tc=0$): `rgb(55, 115, 85)` — warm dark teal.
At the leaves ($tc=1$): `rgb(0, 245, 212)` — pure cyan.

**Line width** — exponential taper so the trunk is visually massive and branches thin to near-zero:

$$w(d) = \max\!\bigl(0.5,\; (D - d + 0.7)^{2.6} \times 0.32\bigr)$$

| Depth | Width |
|-------|-------|
| 0 (trunk) | ~9.6 px |
| 1 (category) | ~4.2 px |
| 2 (project) | ~1.3 px |

### Growth Animation

On page load the tree grows over $T = 4.5$ seconds. The global growth progress is $g = \min(elapsed/T, 1) \in [0,1]$. Each node at depth $d$ has a start time:

$$g_{start}(d) = 0.26\,d \quad \Longrightarrow \quad d=0: 0\%,\quad d=1: 26\%,\quad d=2: 52\%$$

The per-node local progress uses an **ease-out** function:

$$\ell = f\!\left(\text{clamp}\!\left(\frac{g - g_{start}}{0.32}, 0, 1\right)\right), \qquad f(t) = 1 - (1-t)^{2.5}$$

The exponent $2.5$ gives a fast initial burst that decelerates smoothly — faster than quadratic ($2$), slower than cubic ($3$). At $\ell = 0.5$ the branch is drawn half its final length; at $\ell = 1$ it is complete.

### Wind & Sway

Mouse X position $x_m \in [0,1]$ (desktop) or phone tilt drives a wind scalar:

$$\text{wind} = (x_m - 0.5) \times 2.2 \in [-1.1,\, 1.1]$$

Each branch sways via a **sum of three sinusoids** at different frequencies, amplitude proportional to depth fraction $df = d/(D-1)$ (tips sway more than the trunk):

$$\text{sway}(t) = \text{wind} \cdot df \cdot 0.6 \cdot \sum_{k} A_k \sin(\omega_k t + \psi_k)$$

| $k$ | $A_k$ | $\omega_k$ (rad/s) | $\psi_k$ |
|-----|-------|--------------------|----------|
| 0 | 1.00 | 0.65 | $\phi$ |
| 1 | 0.40 | 1.40 | $1.8\phi$ |
| 2 | 0.15 | 2.20 | $0.6\phi$ |

The three frequencies (0.65, 1.40, 2.20) have no simple integer ratios, so the combined waveform is quasi-periodic and never exactly repeats. The branch angle becomes $\theta + \text{sway}$. Since child branches inherit their parent's endpoint, sway propagates down the hierarchy naturally.

### Leaf Distribution

Each project node has 8–12 leaves. Each leaf has a position parameter $\tau \in [0.45, 1.0]$ — its fractional position along the branch length. The leaf's canvas position is:

$$P_{leaf} = P_{start} + \tau (P_{end} - P_{start})$$

This distributes leaves continuously along the branch — denser near the tip ($\tau \approx 1$) with scattered leaves further back — rather than all clumped at the endpoint.

Each leaf flutters independently:

$$\theta_{leaf}(t) = \theta_{branch} + \Delta\phi_{leaf} + \underbrace{0.4 \cdot \text{wind} \cdot \sin(2.1t + \phi_{leaf})}_{\text{flutter}}$$

where $\Delta\phi_{leaf} \in [-0.95\pi, 0.95\pi]$ is the leaf's fixed angular offset from the branch direction.

### Line Width Derivation

The width formula $w = (D - d + 0.7)^{2.6} \times 0.32$ is chosen so that:
- The ratio of trunk to tip width is approximately $9.6 / 1.3 \approx 7.4$
- In real trees, trunk-to-twig width follows a power law related to Da Vinci's rule of tree branching: $r_{parent}^n = \sum r_{child}^n$ where $n \approx 2$. Our formula approximates this aesthetically without enforcing exact conservation.

### Hover Detection

Every frame, leaf canvas positions are recorded. On pointer move, the nearest leaf within radius $R$:

$$i^* = \arg\min_i d(cursor, P_i), \quad \text{if } d(cursor, P_{i^*}) < R$$

Desktop: $R = 42$ px. Mobile: $R = 60$ px (wider for finger accuracy).

### Falling Leaf Particles

At each frame, each fully-grown leaf cluster ($\ell = 1$) emits a particle with probability $p = 0.003$, up to a cap of 80 particles. Particle physics each frame:

$$x \mathrel{+}= v_x + 0.22 \cdot \text{wind}, \qquad y \mathrel{+}= v_y$$
$$v_y \mathrel{+}= 0.012 \quad (\text{capped at } 2.5\ \text{px/frame}), \qquad v_x \mathrel{\times}= 0.997$$
$$\theta \mathrel{+}= \omega_{spin}, \qquad life \mathrel{-}= 0.005$$

Lifetime: $1/0.005 = 200$ frames $\approx 3.3$ seconds at 60 fps.

---

## FractalBackground — Transition System

**File:** `src/components/FractalBackground/index.jsx`

Two canvas slots (A and B) exist simultaneously. When the route changes fractal type:

**Instant cut** — when the new type is `null` (About, Projects) or `prefers-reduced-motion` is set. The old fractal disappears in a single frame.

**Cross-fade** — when both types are non-null (e.g. Julia → Network), opacity transitions over $T = 1500$ ms using an **ease-in-out** (smoothstep) function:

$$f(t) = \begin{cases} 2t^2 & t < 0.5 \\ 1 - \dfrac{(-2t+2)^2}{2} & t \geq 0.5 \end{cases}$$

This is $C^1$ continuous at $t = 0.5$ (same value and derivative from both sides) and satisfies $f(0) = 0$, $f(1) = 1$, $f'(0) = f'(1) = 0$ — it starts and ends with zero velocity, avoiding abrupt visible changes.

Per frame:

$$\alpha_{active} = 1 - f(t), \qquad \alpha_{incoming} = f(t), \qquad t = \min\!\left(\frac{elapsed}{1500},\ 1\right)$$

---

## Hero Page — CSS Animations

**Files:** `src/pages/Hero.jsx`, `src/pages/Hero.css`

All hero animations are pure CSS `@keyframes` with delays computed in JSX. Each element's delay is chained from the previous one.

### Name — Character Stagger

Each character $i$ of the name has an animation delay:

$$t_i = t_0 + i \cdot \Delta t, \qquad t_0 = 0.6\ \text{s},\quad \Delta t = 0.08\ \text{s}$$

For "GOR" (3 characters): delays of $0.60$, $0.68$, $0.76$ seconds.

Each character animates with `cubic-bezier(0.16, 1, 0.3, 1)` — a spring-like ease-out. This Bézier curve has:
- Control point 1 at $(0.16, 1)$ — fast early acceleration
- Control point 2 at $(0.3, 1)$ — slight overshoot past the end value

```css
@keyframes char-in {
  from { opacity: 0; transform: translateY(24px); filter: blur(6px); }
  to   { opacity: 1; transform: translateY(0);    filter: blur(0);   }
}
```

### Scroll Hint — Lifecycle Animation

The scroll hint runs a complete appear-hold-disappear lifecycle in one 5-second keyframe sequence:

| Time | Progress | State |
|------|----------|-------|
| 0% (0 s) | 0.00 | Invisible, 6px below |
| 15% (0.75 s) | 0.15 | Fully visible |
| 75% (3.75 s) | 0.75 | Fully visible (held) |
| 100% (5 s) | 1.00 | Invisible, 6px above |

The `translateX(-50%)` horizontal centering offset appears in **every** keyframe because `animation-fill-mode: both` is used. With `both`, the first keyframe applies immediately during the delay period — without it, the element would sit at `left: 50%` without the translate offset and appear off-center until the animation starts.

### Divider Rule

The rule uses `transform: scaleX()` rather than `width` animation for performance — `scaleX` is GPU-composited and doesn't trigger layout reflow:

$$\text{scaleX: } 0 \to 1 \quad \text{(from center outward, via } transform\text{-origin: center)}$$

---

## EdgeNav — Proximity Navigation

**File:** `src/components/EdgeNav/EdgeNav.jsx`

Three navigation links sit at the screen edges. Their visibility is driven by proximity — how close the mouse is to each edge — computed from the normalised mouse position $(x_m, y_m) \in [-1,1]^2$:

$$p_L = \max\!\left(0,\ 1 - \frac{x_m + 1}{0.5}\right) \quad \text{(left edge)}$$

$$p_R = \max\!\left(0,\ 1 - \frac{1 - x_m}{0.5}\right) \quad \text{(right edge)}$$

$$p_B = \max\!\left(0,\ 1 - \frac{y_m + 1}{0.5}\right) \quad \text{(bottom edge)}$$

Each proximity is $1$ when the mouse is at the edge and $0$ when it is $50\%$ of the half-range away (i.e. $x_m > -0.5$ for the left edge). Opacity scales linearly:

$$\alpha = 0.15 + 0.85\,p$$

The glow is a double-layer CSS `text-shadow` — an inner tight bloom and an outer soft bloom:

$$\sigma_{inner} = 4 + 12p \ \text{px}, \quad \alpha_{inner} = 0.8p$$
$$\sigma_{outer} = 8 + 8p \ \text{px}, \quad \alpha_{outer} = 0.4p$$

---

## Input System — Mouse, Touch, Orientation

**File:** `src/hooks/useMousePosition.js`

Returns a normalised pointer position $(x, y) \in [-1,1]^2$, abstracting across three input methods. All coordinates follow the WebGL convention: $+x$ right, $+y$ up.

### Desktop — Mouse

Pixel coordinates $(p_x, p_y)$ → normalised:

$$x = \frac{2p_x}{W} - 1, \qquad y = 1 - \frac{2p_y}{H}$$

The Y axis is flipped because browser pixels have $+y$ pointing down while WebGL (and this hook's convention) has $+y$ pointing up.

Updates are throttled to one per `requestAnimationFrame` — the handler stores raw coordinates; the RAF callback reads and normalises them, preventing redundant React state updates at sub-frame mouse rates.

### Mobile — Touch Drag

First touch point $(\tau_x, \tau_y)$ → normalised using the same formula as mouse. Touch drag takes priority over orientation for 600 ms after each `touchmove` event:

$$\text{useTilt} = (\text{now} - t_{lastDrag} > 600\ \text{ms})$$

### Mobile — Device Orientation (Gyroscope)

The `deviceorientation` event provides Euler angles of the device:
- $\gamma$ — rotation around the device's Y-axis (left/right tilt): $\gamma \in [-90°, 90°]$
- $\beta$ — rotation around the device's X-axis (forward/back tilt): $\beta \in [-180°, 180°]$

These map to the same $[-1, 1]$ normalised space, with $\pm 30°$ of physical tilt spanning the full range:

$$x = \text{clamp}\!\left(\frac{\gamma}{30},\ -1,\ 1\right), \qquad y = \text{clamp}\!\left(\frac{-\beta}{30},\ -1,\ 1\right)$$

The negative sign on $\beta$ means tilting the phone forward (top away from you) maps to $+y$ (up) — the same direction as moving the mouse upward.

**Permission model:**

- **Android / Chrome:** Events fire automatically over HTTPS. No permission API exists.
- **iOS 13+:** `DeviceOrientationEvent.requestPermission()` must be called inside a synchronous user-gesture handler. The hook calls it immediately on mount (succeeds silently if previously granted), then registers a one-time `touchstart` handler as a fallback for first-time visitors. A second listener is registered for `deviceorientationabsolute` — the Chrome-on-Android variant that provides absolute (compass-referenced) orientation instead of relative.

### iOS Scroll Lock

On pages with full-screen interactive canvases (Home, Contact), a non-passive `touchmove` listener prevents the browser's default scroll/rubber-band behaviour:

```js
document.addEventListener('touchmove', e => e.preventDefault(), { passive: false })
```

`{ passive: false }` opts out of the browser's passive event optimisation — required to allow `preventDefault()` on `touchmove`. Passive listeners were introduced to guarantee 60fps scroll performance; opting out is safe here because these pages have nothing to scroll.

The listener is added on component mount and removed on unmount, so it only applies to the specific pages where it's needed. `preventDefault()` suppresses only the browser's default behaviour (scroll/zoom) — all other `touchmove` JavaScript handlers continue to fire normally, including the fractal control.
