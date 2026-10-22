interface ContainerChild {
  block_id: string
  block_type: string
}

export default defineEventHandler(async (event): Promise<AdminVideo[]> => {
  const courseId = courseIdParam(event)
  const unitId = unitIdParam(event, courseId)
  const { children } = await edxFetch<{ children: ContainerChild[] }>(
    event,
    studioUrl(`/api/contentstore/v1/container/${edxKey(unitId)}/children`),
  )
  const videos = children.filter(child => child.block_type === 'video')
  const blocks = await Promise.all(videos.map(child => getBlock(event, courseId, child.block_id)))
  return blocks.map((block, i) => toAdminVideo(unitId, { ...block, id: videos[i]!.block_id }))
})
