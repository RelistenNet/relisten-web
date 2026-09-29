# Daily Relisten Guessing Game

It would be really cool to have a daily relisten game, inspired by things like wordle and maptap. The obvious pathway forward is to clip a bunch of jams and then ask the user to answer several questions.

This could be expanded to support several bands, but personally I am most interested in supporting Phish. However that can be the initial architecture which is flexible enough to add more bands in the future. If we end up with a variety of artists, we can have a global quiz that asks "what band is this"?

e.g.

What year is this from?
What song is this jam out of?
What venue/city?
This could be a map like maptap where you have to land it close to the venue location.
What date?

### The data model

We'll need to design a flexible data model for tagging worthwhile jams and clips. Rather than manually clipping the audio, we can store duration and timestamps alongside hashed file urls – if the cache busts on that file, we can soft delete it or mark it under review.

We'll need to extend the postgres database to support this.

Results can be stored locally in the users browser for now. Localstorage is probably fine. Though we may want to store user results in the db (we just dont have authentication yet).

### Building the collection

We'd need some admin or user-facing panel to submit potential jams. This would be admin/approved users only, not available to the 'public'.

After building up a library of several hundred, that'll cover us for a year or so.

I'm thinking a password protected page for v1, in which we can "add" new clips. Review existing. And so on. Later on we can have authentication.

### Clips

Clips can be either explicitly a length, or perhaps we can reduce the number of points won as you listen to more and more. Interesting to figure out which is the right solution here, probably a mix of the two?

Actually, maybe its worth having three clips per day. One is just a song structure. One is a type 1 jam. And one is a type 2 jam.

---

## AI: Questions

### Game mechanics

- How is "the daily" selected — deterministic by date (everyone gets the same one) or random? How do we prevent repeats?
  - Definitely deterministic. Unclear about ordering for now. Could just be incremental in the database, though we may want to shuffle occasionally?
- Streaks, scoring formula, and whether partial credit applies (e.g., year off by 1, venue within X miles)?
  - Yeah, definitely partial credit on the scoring. Close to year, nearby venue, exactly.
- Number of guesses allowed per question — Wordle-style 6 tries, or one shot?
  - I think one shot. But open minded to several.
- Reveal flow: do wrong guesses give hints (e.g., "earlier" / "later" for year, "warmer/colder" for venue)?
  - I don't think so. But could be interesting.
- Share format — Wordle's emoji grid is half the virality. What does a Relisten share string look like?
  - Not sure yet, we'll figure that out at the end.

### Clip selection

- Who picks the clip start timestamp — is it the "best" 30s of the jam, a random window, or curator's choice?
  - Curators choice. The clip shouldnt reveal too much of the song if the jam is type 2, but we can find a balance. Some can be easy, others can be harder.
- Should the clip avoid giving away the answer (e.g., crowd chants of "Tweezer!", Trey announcing the song)?
  - yes, it should avoid giving away the answer and being _too_ obvious.
- Difficulty tiers? Easy = obvious peak, hard = ambient segue.
  - we could do that, potentially.

### Data / infra

- Where does the audio actually stream from — existing Relisten CDN with a range request, or do we pre-render clips? Cost implications?
  - No cost issues. Relisten CDN. We'll be fine.
- How do we handle the "hashed file URL cache bust" detection in practice — a nightly check, or lazy on play?
  - Not sure, probably a daily check.
- Schema: is a "clip" tied to a track+offset+duration, or a free-floating audio range? What if a jam spans two tracks (segue)?
  - We should only focus on one track for now. Two clips is overly complex.

### Submission / review

- What's the approval workflow — single admin, quorum, comment threads?
  - Not sure yet. For now, just blanket approval with admin ability to redact.
- Do submitters see if their clip was used? Attribution?
  - Ehh, no. Not necessary.

### Edge cases

- Mobile autoplay restrictions (iOS requires user gesture) — how do we handle?
  - defer for now
- Accessibility — is there a non-audio fallback or is the game inherently audio-only?
  - defer for now
- Spoilers: if someone plays at 9am ET and posts on Twitter, west coast users get spoiled. Rolling daily, or fixed UTC?
  - fixed EST (12am EST). spoilers dont matter.
- Anti-cheat: Shazam, song fingerprinting sites. Worth caring about?
  - no lol, it's not that serious

### Scope for v1

- Which of the four questions ship in v1? Doing all four at once is a lot — year-only is the tightest MVP.
  - no we need to ship em all
- Map-based venue guessing is a much bigger build than year/song/date. Worth deferring?
  - maybe worth deferring.

---
