/** Sales figures and orders, as the Campus CMS returns them. Amounts are "1234.50" strings (MXN). */

export interface SalesTotals {
  /** Money in during the period (orders by paid date), including later refunds. */
  gross: string
  /** Money back during the period (orders by refund date). */
  refunds: string
  net: string
  paid_orders: number
  refunded_orders: number
  buyers: number
  average_order: string | null
}

export interface SalesPoint {
  /** First day of the bucket (YYYY-MM-DD): the day, or the Monday of the week. */
  date: string
  gross: string
  refunds: string
  net: string
  paid_orders: number
}

export interface CourseSales {
  product_id: number
  title: string
  course_key: string | null
  status: ProductStatus
  sold: number
  refunded: number
  gross: string
  refunds: string
  net: string
}

export interface SalesStats {
  from: string
  to: string
  granularity: 'day' | 'week'
  totals: SalesTotals
  /** Same figures for the same number of days right before. */
  previous: SalesTotals
  series: SalesPoint[]
  courses: CourseSales[]
  /** Current state, not tied to the period. */
  attention: { access_errors: number, pending: number }
}

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type OrderAccess = 'none' | 'granted' | 'revoked' | 'error'

export interface AdminOrder {
  id: number
  username: string
  email: string
  course_key: string
  course_title: string
  amount: string
  currency: string
  status: OrderStatus
  access: OrderAccess
  access_error: string
  created: string
  paid_at: string | null
  refunded_at: string | null
}

export interface CmsPage<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
