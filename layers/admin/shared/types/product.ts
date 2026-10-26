/** A course for sale, as the Campus CMS returns it (`/api/v1/products/`). */
export type ProductStatus = 'draft' | 'created' | 'on_sale' | 'archived'

export interface Product {
  id: number
  title: string
  org: string
  number: string
  run: string
  /** Set once the course exists in Open edX. */
  course_key: string | null
  status: ProductStatus
  /** Decimal string in MXN, e.g. "1499.00". */
  price: string | null
  currency: 'mxn'
  short_description: string
  description: string
  /** Absolute URL served by the CMS. */
  image: string | null
  start: string | null
  end: string | null
  pacing: 'self' | 'instructor'
  /** Open edX usernames that get the instructor role. */
  authors: string[]
  created: string
  modified: string
}

export type ProductInput = Partial<Pick<Product,
  'title' | 'number' | 'run' | 'price' | 'short_description' | 'description' | 'start' | 'end' | 'pacing' | 'authors'
>>

export interface CmsMe {
  username: string
  email: string
  is_contador: boolean
  /** Open edX organization of the courses the CMS creates or adopts. */
  course_org: string
}
