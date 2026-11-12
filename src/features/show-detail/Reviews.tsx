import { StarIcon } from 'lucide-react';
import { sourceReviews } from '@/data/reviews';
import type { Source, SourceReview } from '@/domain/types';
import { numberFormat } from '@/lib/utils';

// A tape's reviews, under its track list. Upstream dates are when Relisten
// imported a review, not when it was written, so none are shown.

/** Reviews shown before "Show more". */
const FIRST = 10;

export default async function Reviews({ source }: { source: Source }) {
  const reviews = await sourceReviews.get(source.id);
  if (reviews.length === 0) return null;
  const ratings = source.numRatings || source.numReviews;

  return (
    <section aria-labelledby="reviews" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="reviews" className="mb-0 text-2xl font-semibold text-text-primary">
          Reviews
        </h2>
        <p className="mb-0 text-sm text-text-muted tabular-nums">
          {source.avgRating > 0 && (
            <>
              <span className="font-medium text-text-primary">{source.avgRating.toFixed(2)}</span>{' '}
              average
              {ratings ? ` of ${numberFormat.format(ratings)} ratings` : ''}
              <span aria-hidden> · </span>
            </>
          )}
          {numberFormat.format(reviews.length)} {reviews.length === 1 ? 'review' : 'reviews'}
        </p>
      </div>
      <ReviewList reviews={reviews.slice(0, FIRST)} />
      {reviews.length > FIRST && (
        <details className="group">
          <summary className="cursor-pointer text-sm text-text-secondary group-open:hidden hover:text-text-primary">
            Show {numberFormat.format(reviews.length - FIRST)} more
          </summary>
          <ReviewList reviews={reviews.slice(FIRST)} />
        </details>
      )}
    </section>
  );
}

function ReviewList({ reviews }: { reviews: SourceReview[] }) {
  return (
    <ul role="list" className="flex flex-col divide-y divide-hairline">
      {reviews.map((review) => (
        <li key={review.id} className="flex flex-col gap-1 py-3">
          <div className="flex items-baseline justify-between gap-4">
            <span
              className={`min-w-0 font-medium text-text-primary ${!review.title && review.author ? 'italic' : ''}`}
            >
              {review.title ?? review.author ?? 'Untitled'}
            </span>
            {review.rating !== undefined && <Rating rating={review.rating} />}
          </div>
          <p className="mb-0 text-sm break-words whitespace-pre-line text-text-secondary">
            {review.body}
          </p>
          {review.title && review.author && (
            <span className="text-xs text-text-muted italic">{review.author}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function Rating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-sm text-text-muted tabular-nums">
      <StarIcon size={12} className="fill-current" aria-hidden />
      {rating}/10
    </span>
  );
}
