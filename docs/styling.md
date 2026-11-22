# Styling

Tailwind v4, with one rule: **classes stay where they're used, and meaning lives in one place.** A named class string in a `.ts` file (`const CELL = '…'`) does neither: you read the name, then go find the classes, and the reason for a value sits in a comment away from where it applies. Instead, each kind of meaning has a home that a class at the call site can name.

| What it is                                                                       | Where it lives                                                               | Example                                                        |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------- |
| A value with meaning                                                             | a theme token in `globals.css` (`@theme`), used as a utility                 | `pl-flow-indent`, `top-dot-y`, `bg-surface-raised`             |
| A value that follows from others                                                 | a token written as that relationship, so it can't drift                      | `--spacing-flow-indent: calc(1px + var(--spacing-card-x) + …)` |
| A state                                                                          | a custom variant (`@custom-variant`), or a built-in one (`data-*`, `aria-*`) | `in-drop-join:ring-2`                                          |
| A thing with a name in the product                                               | a component, its classes inline inside it                                    | `Card`, `Prose`, `Rail`                                        |
| A thing applied to several kinds of element (a link, a button, a menu's trigger) | an `@utility`, with each of its kinds a utility of its own                   | `header-action`, `header-action-primary`                       |
| One indivisible idea made of several properties (and its states)                 | an `@utility`                                                                | `drop-indicator`                                               |
| Anything else                                                                    | plain classes, inline                                                        | `rounded-lg text-sm gap-2`                                     |

## Rules of thumb

- **Name a value, not a class list.** If a number means something (where a card's title starts, a 65-character measure), make it a token, and write the reason on the token. If it means nothing beyond how it looks, leave it inline.
- **Derive, don't repeat.** A value that is the sum of others is written as that sum (`calc()` over tokens), not as its result with a comment.
- **A kind is its own utility.** Don't override part of an `@utility` with plain classes at the call site (`header-action border-transparent`). The two compete on stylesheet order, and `cn`'s tailwind-merge can't see inside the utility. Add a kind (`header-action-quiet`) that builds on the base in one rule. The linter's `no-conflicting-classes` catches the override.
- **`@utility` is for indivisible ideas, not for grouping.** "Card padding" is tokens on a component. "The line a drop lands on, at whichever edge" is one idea with states: an `@utility`.
- **No class strings in `.ts` constants.** If two components share a look, they share a component (or a kind of utility).
- **Whole pixels for hairlines.** A 1px line placed at a half pixel (a `-translate-x-1/2` on a 1px element) antialiases across two. Give it a token for its edge.

## Proving a refactor changes nothing

A styling refactor should change no pixels. Capture the article (positions, sizes, colors and font of every text run, and a screenshot) on the read page and the editor, at desktop and phone width, before and after, and compare. The playlist refactor did this: every capture that loads came out identical.
