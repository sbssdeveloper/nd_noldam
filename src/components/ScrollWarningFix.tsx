'use client'

import { useEffect } from 'react'

/**
 * Component that automatically marks all fixed/sticky positioned elements
 * with data-nextjs-scroll-disabled to prevent Next.js scroll warnings.
 * This runs once on mount and whenever the DOM changes.
 */
const ScrollWarningFix = () => {
  useEffect(() => {
    const markFixedElements = () => {
      // Find all elements with fixed or sticky positioning
      const allElements = document.querySelectorAll('*')
      
      allElements.forEach((element) => {
        const styles = window.getComputedStyle(element)
        const position = styles.position
        
        if (position === 'fixed' || position === 'sticky') {
          // Only add attribute if not already present
          if (!element.hasAttribute('data-nextjs-scroll-disabled')) {
            element.setAttribute('data-nextjs-scroll-disabled', 'true')
          }
        }
      })
    }

    // Run immediately
    markFixedElements()

    // Watch for DOM changes (new elements added dynamically)
    const observer = new MutationObserver(() => {
      markFixedElements()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  return null
}

export default ScrollWarningFix

