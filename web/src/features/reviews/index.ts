// Barrel — feature `reviews` (US-065 + US-066).
export { organizerReviewsApi } from './api/organizerReviewsApi';
export type {
  CreateReviewInput,
  CreateReviewView,
  CreateReviewDTO,
  CreateReviewEnvelope,
  CreateReviewRequestBody,
  CreateReviewErrorCode,
  ReviewNotEligibleReason,
} from './api/organizerReviewsApi.types';
export { useCreateReview, reviewsKeys } from './hooks/organizerReviewsQueries';
export type { CreateReviewContext } from './hooks/organizerReviewsQueries';
export { StarRating } from './components/StarRating';
export type { StarRatingProps } from './components/StarRating';
export { ReviewEligibilityBanner } from './components/ReviewEligibilityBanner';
export type { ReviewEligibilityBannerProps } from './components/ReviewEligibilityBanner';
export { ReviewForm } from './components/ReviewForm';
export type { ReviewFormProps } from './components/ReviewForm';

// US-066 (PB-P1-039): listado público paginado de reviews por vendor.
export { vendorReviewsApi } from './api/vendorReviewsApi';
export type {
  AnonymizedReviewDTO,
  VendorSummaryDTO,
  PaginationDTO,
  ListVendorReviewsDTO,
  ListVendorReviewsEnvelope,
  ListVendorReviewsQuery,
  ListVendorReviewsView,
  ListVendorReviewsErrorCode,
  VendorReviewStatus,
} from './api/vendorReviewsApi.types';
export { useVendorReviews, vendorReviewsKeys } from './hooks/vendorReviewsQueries';
export type { UseVendorReviewsOptions } from './hooks/vendorReviewsQueries';
export { AverageRating } from './components/AverageRating';
export type { AverageRatingProps } from './components/AverageRating';
export { ReviewListItem } from './components/ReviewListItem';
export type { ReviewListItemProps } from './components/ReviewListItem';
export { VendorReviewsSection } from './components/VendorReviewsSection';
export type { VendorReviewsSectionProps } from './components/VendorReviewsSection';
