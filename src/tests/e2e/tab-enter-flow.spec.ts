import { test, expect } from '@playwright/test'

// REL-001: requires running dev server + authenticated Supabase session
test.skip('NFR-1 Tab/Enter flow — register 3-leg Extração without mouse', async ({ page }) => {
  await page.goto('/operacoes/nova')

  // Select tipo "Extração"
  await page.keyboard.press('Tab')
  await page.selectOption('select[name="tipo"]', 'Extracao')

  // Fill data with today
  const today = new Date().toISOString().split('T')[0]
  await page.keyboard.press('Tab')
  await page.fill('input[name="data"]', today)

  // valorPagoFixo = 85
  await page.keyboard.press('Tab')
  await page.fill('input[name="valorPagoFixo"]', '85')
  await page.keyboard.press('Tab')

  // Leg 1
  await page.keyboard.press('Tab') // focus casaId
  await page.keyboard.press('Tab') // stake
  await page.fill('input[name="legs.0.stake"]', '20')
  await page.keyboard.press('Tab') // grossReturn
  await page.fill('input[name="legs.0.grossReturn"]', '85')
  await page.keyboard.press('Tab') // isFreebet
  await page.keyboard.press('Tab') // isDoubleGreen
  await page.keyboard.press('Enter') // add leg 2

  // Verify Leg 2 appeared
  await expect(page.locator('[data-testid="leg-1"]')).toBeVisible()

  // Leg 2
  await page.keyboard.press('Tab')
  await page.fill('input[name="legs.1.stake"]', '39')
  await page.keyboard.press('Enter') // add leg 3

  // Leg 3
  await page.keyboard.press('Tab')
  await page.fill('input[name="legs.2.stake"]', '26')
  await page.keyboard.press('Enter') // submit form

  // Assert redirect to /operacoes and operation visible as Pendente
  await expect(page).toHaveURL('/operacoes')
  await expect(page.getByText('Pendente').first()).toBeVisible()
})
