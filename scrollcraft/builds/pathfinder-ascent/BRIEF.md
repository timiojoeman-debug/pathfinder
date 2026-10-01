# BRIEF — PathFinder

Interviewed 2026-09-02. Answers verbatim, not paraphrased.

Audience, stated separately by the user: **a student just starting out.** Not the
university career service — `universities/` is a separate B2B2C page and stays that way.

---

## The eight answers, verbatim

**1. Vibe in three to five words, plus references**

> a journey, discovery, new world

No external references given. The reference is the product's own existing world (see
Assets), which is the strongest possible anchor: it is not borrowed from anywhere.

**2. The scroll journey, section by section**

> The initial start of the trek through the mountains, then in-between them, then at
> the end of the scroll they finally reach their destination (Read brief about what
> pathfinder is beforehand)

**3. The energy curve**

> Should feel intense at the start but calmer as it goes along till the end

**4. How they should feel, and the ONE moment**

> The should feel WOWED by the amount of tiny detail that goes into it, especially at
> the end

**5. One thing this site should do that no site has done**

> The effects & animations should feel like a motivational speech, if you catch my drift

**6. How far from premium-minimal**

> i have no idea (go wild)

**7. One unbroken world, or distinct scenes?**

> one world (continuous, expanding place)

**8. What assets do you already have?**

> Just the ones on the site currently

---

## What answer 8 actually turned out to be

The existing landing page is not a set of assets. It is already a worldflight, built
over twelve commits on `feat/persistent-globe`:

- A domain-warped ridged-multifractal height field in world space (`src/app/page.tsx`,
  `heightField`), projected in perspective and painted back-to-front so each ridge
  occludes the one behind it. Stroked line art, no WebGL, no material system.
- A camera moving along a route through **seven stations** (`STATIONS`), one per
  section in document order. Station 0 is the trailhead; 1-6 are the six phases.
- Aerial-perspective haze as a function of depth and pitch, tuned per theme.
- A `setRange(camV)` gate that keeps the range below the copy at every station.

This has three consequences that govern the whole build:

1. **No generated assets are needed.** Missing `KIE_AI_API_KEY` and missing ffmpeg are
   therefore not blockers. The world is parametric, so it scrubs exactly under the
   wheel with no video decode, no GOP tuning, no mobile clip lifecycle, and no spend.
2. **The mountains, the trek and the destination in answer 2 already exist.** The
   journey the user described is the journey the page already walks.
3. **This is a revision, not a new build.** Writing a second scroll page from zero
   would duplicate a renderer already tuned across twelve commits.

---

## The feeling curve

Written before the acts. Answers 3 and 4 look contradictory — "calmer till the end"
against "wowed, especially at the end" — and they are not. Energy is loudness; feeling
is not. The end gets **quieter and denser at the same time**: the intensity at the
destination is detail arriving, not volume rising. That reading is the spine of the
build.

| Act | Feeling | What on screen causes it |
|---|---|---|
| 0 Trailhead | Exposed, slightly daunted | Camera at eye level at v=0, the range low and wide, nothing yet earned |
| 1 Named | Recognised | The position report; the valley opens as the camera moves off the trailhead |
| 2 The climb | Orientation, the one lift | Pitch to 0.68, the only time the journey leaves the ground — the whole structure visible at once |
| 3 Descent | Committed | Back down to pitch 0.16, valley closing to a corridor |
| 4 Levelling | Trust | The deliberate crawl: 0.3 route units against 2.4 everywhere else, under "no numbers we haven't earned" |
| 5 Arrival | **WOWED — the peak** | The destination resolves. Detail density peaks as motion stops |
| 6 Held | Steady, carried | The close resolves and holds instead of becoming a bar |

**Authored silence:** the station 4→5 crawl (v 9.6 → 9.9) is deliberate, not dead
scroll. The stretch that carries "no numbers we haven't earned" is the one stretch that
does not perform. A verification pass reporting dead scroll there is reporting the
design working.

## The peak

> "It's the site where you're walking a narrow valley the whole way, and right at
> the end it pulls back and you see the country you just crossed."

Lives in act 5, the arrival. It must get the largest scroll span on the page and the
most visual change, and act 4 in front of it is the quietest thing on the page.

## The tell-someone sentence

**It's the site where** scrolling is walking a route, and the last thing it does is
stop walking and show you how far you came.

> Recorded after the build: the peak was first built as a plan-view map that the
> walk resolved into. It was rejected on sight — a diagram is a different object
> from the world, and cutting to one at the end ends the journey rather than
> completing it. The version that shipped keeps the reader inside the same world
> and moves the camera instead. The brief's intent did not change; the device did.

---

## The conflict this brief has to resolve

Two findings, both grounded in the current file, both against the user's own answers:

1. **The page currently ends by becoming a footer.** After the CTA at station 5
   (v=9.9) the camera travels 2.7 route units — the longest single leg on the page,
   more than any phase transition — to arrive at station 6, which renders a plain
   opaque bar of links (`page.tsx:2202`). The longest move on the journey lands on the
   least. That breaks the user's answer 4 (the wow is at the end) and it breaks the
   skill's hard rule: an ending that just becomes a footer must be replaced with a
   close that resolves and holds.

2. **The current peak is in the middle.** Station 2, the six-phase climb at pitch 0.68,
   is the largest visual change on the page. Under answer 4 the peak belongs at the
   arrival. The climb stays — it earns its place as orientation — but it must stop
   being the largest thing, or the page has two competing peaks and therefore none.

## Hard rules inherited from the product

From `CLAUDE.md`, binding and not negotiable by taste:

- **No invented statistics, testimonials, partner logos, or outcome numbers.** No stat
  counters anywhere, however well one would sit at the arrival. A product that tells
  students not to embellish their CV cannot embellish its own page.
- Progress and any number shown must be evidence-derived.
- Illustrative UI mockups are allowed when labelled as such.
