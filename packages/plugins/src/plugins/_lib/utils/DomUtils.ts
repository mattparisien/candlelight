class DomUtils {
  /**
   * Gets an element by its ID.
   * @param id The ID of the element to find.
   * @returns The HTMLElement found, or null if none exists with the given ID.
   */
  static getElementById(id: string): HTMLElement | null {
    return document.getElementById(id);
  }

  /**
   * Creates a new element with the specified tag.
   * @param tagName The tag name of the element to create.
   * @returns The new HTMLElement.
   */
  static createElement(tagName: string): HTMLElement {
    return document.createElement(tagName);
  }

  /**
   * Adds a class to an element.
   * @param element The element to add the class to.
   * @param className The class name to add.
   */
  static addClass(element: HTMLElement, args: string | string[]): HTMLElement {
    if (Array.isArray(args)) {
      // If args is an array, apply each class name using spread syntax
      element.classList.add(...args);
    } else {
      // If args is a single class name, just add it directly
      element.classList.add(args);
    }
    return element;
  }

  /**
   * Removes a class from an element.
   * @param element The element to remove the class from.
   * @param className The class name to remove.
   */
  static removeClass(element: HTMLElement, className: string): void {
    element.classList.remove(className);
  }

  /**
   * Toggles a class on an element.
   * @param element The element to toggle the class on.
   * @param className The class name to toggle.
   */
  static toggleClass(element: HTMLElement, className: string): void {
    element.classList.toggle(className);
  }

  /**
   * Sets an attribute on an element.
   * @param element The element to set the attribute on.
   * @param name The name of the attribute to set.
   * @param value The value of the attribute.
   */
  static setAttribute(element: HTMLElement, name: string, value: string): void {
    element.setAttribute(name, value);
  }

  /**
   * Removes an attribute from an element.
   * @param element The element to remove the attribute from.
   * @param name The name of the attribute to remove.
   */
  static removeAttribute(element: HTMLElement, name: string): void {
    element.removeAttribute(name);
  }

  /**
   * Gets the element within the document that match the specified selector.
   * @param selector The CSS selector to query for.
   * @returns The Node element matching the selector.
   */
  static querySelector(selector: string): HTMLElement {
    return document.querySelector(selector);
  }

  /**
   * Gets all elements within the document that match the specified selector.
   * @param selector The CSS selector to query for.
   * @returns A NodeList of all elements matching the selector.
   */
  static querySelectorAll(selector: string | string[]): HTMLElement[] {
    if (!selector) return;

    return Array.from(
      document.querySelectorAll(
        Array.isArray(selector) ? selector.join(",") : selector
      )
    );
  }

  /**
   *
   * @param container The contains to append the elements to
   * @param children An array of elements to append to the conainer
   * @returns void
   */
  static appendMany(container: HTMLElement, children: HTMLElement[]): void {
    if (!container || !children || !children.length) return;

    children.forEach((child) => container.appendChild(child));
  }

  /**
   *
   * @param elements The element to wrap
   * @param wrapperEl A string corresponding to the html element to use to wrap the element
   * @returns The wrapped element
   */
  static wrapElement(element: HTMLElement, wrapperEl: string | HTMLElement): HTMLElement {
    if (!element || !wrapperEl || (typeof wrapperEl === "string" && wrapperEl.trim() === "")) return;

    const wrapper = wrapperEl instanceof HTMLElement ? wrapperEl.cloneNode(true) as HTMLElement : document.createElement(wrapperEl);
    
    // Insert the wrapper before the element in the DOM
    element.parentNode?.insertBefore(wrapper, element);
    
    // Move the element into the wrapper
    wrapper.appendChild(element);

    return wrapper;
  }
  /**
   *
   * @param elements The elements to wrap
   * @param wrapperEl A string corresponding to the html element to use to wrap the elements
   * @returns The wrapped elements
   */
  static wrapMany(elements: HTMLElement[], wrapperEl: string | HTMLElement, attrs?: { [key: string]: string }): HTMLElement[] {
    if (!elements || !elements.length) return;

    const wrappedElements = [];

    elements.forEach((element) => {
      const wrapper = DomUtils.wrapElement(element, wrapperEl);
      if (attrs) {
        Object.keys(attrs).forEach((key) => {
          wrapper.setAttribute(key, attrs[key]);
        });
      }
      wrappedElements.push(wrapper);
    });

    return wrappedElements;
  }

  /**
   * Wraps all sibling elements following the specified start element up to a given index in a single wrapper element.
   * @param startElement The element after which siblings will be wrapped.
   * @param wrapperEl A string corresponding to the html element to use to wrap the siblings
   * @param stopAtIndex The index at which to stop wrapping siblings (0-based).
   * @param attrs Optional attributes to set on the wrapper element.
   * @param includeStartElement Whether to include the start element itself in the wrapper.
   * @returns The wrapper HTMLElement containing all the siblings.
   * */
  static wrapSiblings(startElement: HTMLElement, wrapperEl: string | HTMLElement, stopAtIndex: number, attrs?: { [key: string]: string }, includeStartElement?: boolean): HTMLElement {
    if (!startElement || !wrapperEl || (typeof wrapperEl === "string" && wrapperEl.trim() === "")) return;

    // Create the single wrapper element
    const wrapper = typeof wrapperEl === 'string' ? document.createElement(wrapperEl) : wrapperEl.cloneNode(true) as HTMLElement;
    
    // Add attributes if provided
    if (attrs) {
      Object.keys(attrs).forEach((key) => {
        wrapper.setAttribute(key, attrs[key]);
      });
    }

    // Collect all elements to wrap
    const elementsToWrap: HTMLElement[] = [];
    
    // Include start element if requested
    if (includeStartElement) {
      elementsToWrap.push(startElement);
    }
    
    // Collect siblings
    let currentElement: HTMLElement | null = startElement.nextElementSibling as HTMLElement;
    let currentIndex = 0;

    while (currentElement && currentIndex <= stopAtIndex) {
      elementsToWrap.push(currentElement);
      currentElement = currentElement.nextElementSibling as HTMLElement;
      currentIndex++;
    }

    if (elementsToWrap.length > 0) {
      // Insert the wrapper before the first element
      elementsToWrap[0].parentNode?.insertBefore(wrapper, elementsToWrap[0]);
      
      // Move all elements into the wrapper
      elementsToWrap.forEach(element => {
        wrapper.appendChild(element);
      });
    }

    return wrapper;
  }

  /**
   * Traverses up the DOM tree from the currently focused element to find the nearest ancestor that matches the specified selector.
   * @param element The starting HTMLElement to begin traversal from.
   * @param selector The CSS selector to match against ancestor elements.
   * @returns The matching ancestor HTMLElement, or null if none is found.
   * */

  static traverseUpTo(element: HTMLElement, selector: string): HTMLElement | null {
    if (!element || !selector) return null;

    let currentElement: HTMLElement | null = element;
    while (currentElement) {
      if (currentElement.matches(selector)) {
        return currentElement;
      }
      currentElement = currentElement.parentElement;
    }
    return null;
  }


  /**
   * Traverses the DOM tree from the given element to find the next sibling that matches the specified selector.
   * @param element The starting HTMLElement to begin traversal from.
   * @param selector The CSS selector to match against sibling elements.
   * @return The matching sibling HTMLElement, or null if none is found.
   * */
  static getNextSibling(element: HTMLElement, selector: string): HTMLElement | null {
    if (!element || !selector) return null;

    let sibling: HTMLElement | null = element.nextElementSibling as HTMLElement;
    while (sibling) {
      if (sibling.matches(selector)) {
        return sibling;
      }
      sibling = sibling.nextElementSibling as HTMLElement;
    }
    return null;
  }

  /**
   * Traverses the DOM tree from the given element to find all next siblings that match the specified selector, up to a specified index.
   * @param element The starting HTMLElement to begin traversal from.
   * @param selector The CSS selector to match against sibling elements.
   * @param stopAtIndex The index at which to stop collecting matching siblings (0-based).
   * @return An array of matching sibling HTMLElements.
   * */
  static getNextSiblings(element: HTMLElement, selector: string, stopAtIndex: number): HTMLElement[] {
    if (!element || !selector) return [];

    const siblings: HTMLElement[] = [];
    let sibling: HTMLElement | null = element.nextElementSibling as HTMLElement;
    let currentIndex = 0;

    while (sibling) {
      if (sibling.matches(selector)) {
        siblings.push(sibling);
        if (currentIndex === stopAtIndex) break;
        currentIndex++;
      }
      sibling = sibling.nextElementSibling as HTMLElement;
    }

    return siblings;
  }
}

export default DomUtils;
