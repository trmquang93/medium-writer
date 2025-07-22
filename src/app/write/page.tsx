'use client'

import { ArticleWorkflow } from '@/components/workflow/ArticleWorkflow'
import { TestConnection } from '@/components/TestConnection'

export default function WritePage() {
  return (
    <>
      <ArticleWorkflow />
      <TestConnection />
    </>
  )
}