/**
 * domain.ts — Domain Resolver
 * ตรวจสอบและ resolve domain (law / accounting) จาก requirement
 */

import { getLawGuardKeywords } from './prompts/law.prompt'
import { getAccountingGuardKeywords } from './prompts/accounting.prompt'
import { getLawSystemPrompt } from './prompts/law.prompt'
import { getAccountingSystemPrompt } from './prompts/accounting.prompt'
import config from '../hermes.config'

export type Domain = 'law' | 'accounting' | 'general'

/**
 * ตรวจ domain จาก topic + brief
 * Priority: requirement.domain → keyword match → config default
 */
export function resolveDomain(requirement: Record<string, unknown>): Domain {
  // 1. ถ้า requirement ระบุ domain ตรงๆ
  const explicitDomain = String(requirement.domain ?? '')
  if (explicitDomain === 'law' || explicitDomain === 'accounting') {
    return explicitDomain
  }

  // 2. Keyword match จาก topic + brief
  const text = [
    String(requirement.topic ?? ''),
    String(requirement.brief ?? ''),
    String(requirement.title ?? ''),
  ].join(' ')

  const lawScore = getLawGuardKeywords().filter(kw => text.includes(kw)).length
  const accScore = getAccountingGuardKeywords().filter(kw => text.includes(kw)).length

  if (accScore > lawScore && accScore >= 2) return 'accounting'
  if (lawScore >= 1) return 'law'

  // 3. Fallback: config default
  if (config.domain === 'accounting') return 'accounting'
  return 'law'
}

/**
 * เลือก system prompt ตาม domain
 */
export function getDomainSystemPrompt(domain: Domain): string {
  if (domain === 'accounting') return getAccountingSystemPrompt()
  return getLawSystemPrompt()
}

/**
 * Keyword list รวมทั้ง 2 domain สำหรับ guard check
 */
export function getAllDomainKeywords(): string[] {
  return [...getLawGuardKeywords(), ...getAccountingGuardKeywords()]
}

/**
 * Label สำหรับ display
 */
export function getDomainLabel(domain: Domain): string {
  return domain === 'law' ? '⚖️ กฎหมาย' : domain === 'accounting' ? '📊 บัญชี/ภาษี' : '📌 ทั่วไป'
}
