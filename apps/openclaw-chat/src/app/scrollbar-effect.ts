// Scrollbar effect for better user experience
// Shows scrollbar when scrolling or hovering

export function initializeScrollbarEffect() {
  // Get all scrollable elements
  const scrollableElements = document.querySelectorAll('.overflow-y-auto, .overflow-x-auto, .overflow-auto');

  scrollableElements.forEach((element) => {
    // Add scroll event listener
    element.addEventListener('scroll', () => {
      element.classList.add('scrolling');
      
      // Remove the class after a short delay
      clearTimeout((element as any).scrollTimeout);
      (element as any).scrollTimeout = setTimeout(() => {
        element.classList.remove('scrolling');
      }, 200);
    });
  });
}
