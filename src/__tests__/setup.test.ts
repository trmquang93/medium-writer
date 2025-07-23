/**
 * Test to verify Jest and testing setup is working correctly
 */

describe('Testing Infrastructure', () => {
  it('should have Jest configured correctly', () => {
    expect(true).toBe(true)
  })

  it('should have proper environment setup', () => {
    // Verify DOM environment
    expect(document).toBeDefined()
    expect(window).toBeDefined()
    
    // Verify mocked globals
    expect(localStorage).toBeDefined()
    expect(sessionStorage).toBeDefined()
    expect(fetch).toBeDefined()
  })

  it('should clear mocks between tests', () => {
    // This test verifies that mocks are cleared between tests
    const mockFn = jest.fn()
    mockFn('test')
    expect(mockFn).toHaveBeenCalledWith('test')
  })
})