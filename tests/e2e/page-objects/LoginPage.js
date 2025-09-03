// tests/e2e/page-objects/LoginPage.js
// Page Object Model for login functionality
// Used by HTS Browser tests and other E2E tests requiring authentication

export class LoginPage {
  constructor(page) {
    this.page = page;
    
    // Login form elements
    this.emailInput = page.locator('input[type="email"], input[name="email"]');
    this.passwordInput = page.locator('input[type="password"], input[name="password"]');
    this.loginButton = page.getByRole('button', { name: /login|sign in/i });
    this.rememberMeCheckbox = page.locator('input[type="checkbox"]');
    
    // Error and success messages
    this.errorMessage = page.locator('.error, .text-red-600, [data-testid="error"]');
    this.successMessage = page.locator('.success, .text-green-600, [data-testid="success"]');
    
    // Navigation elements
    this.forgotPasswordLink = page.getByRole('link', { name: /forgot password/i });
    this.signupLink = page.getByRole('link', { name: /sign up|register/i });
    
    // Post-login elements
    this.userMenu = page.locator('[data-testid="user-menu"], .user-menu');
    this.logoutButton = page.getByRole('button', { name: /logout|sign out/i });
  }

  // Navigation
  async goto() {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
    
    // Wait for login form to be ready
    await this.emailInput.waitFor({ state: 'visible' });
  }

  // Login operations
  async login(email, password, rememberMe = false) {
    // Fill in credentials
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    
    // Handle remember me checkbox if requested
    if (rememberMe) {
      await this.rememberMeCheckbox.check();
    }
    
    // Submit login form
    await this.loginButton.click();
    
    // Wait for navigation or error
    await Promise.race([
      this.page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10000 }),
      this.errorMessage.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
    ]);
    
    // Small delay to ensure page is fully loaded
    await this.page.waitForTimeout(1000);
  }

  async quickLogin() {
    // Use default test credentials
    await this.login('admin@sparc.test', 'admin123');
  }

  async loginAsRole(role) {
    const credentials = {
      admin: { email: 'admin@sparc.test', password: 'admin123' },
      manager: { email: 'manager@sparc.test', password: 'manager123' },
      operator: { email: 'operator@sparc.test', password: 'operator123' },
      viewer: { email: 'viewer@sparc.test', password: 'viewer123' }
    };
    
    const creds = credentials[role];
    if (!creds) {
      throw new Error(`Unknown role: ${role}. Available roles: ${Object.keys(credentials).join(', ')}`);
    }
    
    await this.login(creds.email, creds.password);
  }

  // Logout
  async logout() {
    // Try to find and click logout button
    if (await this.userMenu.isVisible()) {
      await this.userMenu.click();
    }
    
    await this.logoutButton.click();
    
    // Wait for redirect to login page
    await this.page.waitForURL(url => url.pathname.includes('/login'), { timeout: 5000 });
  }

  // Verification methods
  async isLoggedIn() {
    // Check if we're not on login page and user menu is present
    const currentUrl = this.page.url();
    const isOnLoginPage = currentUrl.includes('/login');
    const hasUserMenu = await this.userMenu.isVisible().catch(() => false);
    
    return !isOnLoginPage && hasUserMenu;
  }

  async hasLoginError() {
    return this.errorMessage.isVisible();
  }

  async getLoginError() {
    if (await this.hasLoginError()) {
      return this.errorMessage.textContent();
    }
    return null;
  }

  async isOnLoginPage() {
    const currentUrl = this.page.url();
    return currentUrl.includes('/login') && await this.emailInput.isVisible();
  }

  // Form validation helpers
  async getFieldError(fieldName) {
    const fieldError = this.page.locator(`[data-testid="${fieldName}-error"], .field-error`)
      .filter({ hasText: new RegExp(fieldName, 'i') });
    
    if (await fieldError.isVisible()) {
      return fieldError.textContent();
    }
    
    return null;
  }

  async isFormValid() {
    // Check if login button is enabled (indicates form validation passed)
    return this.loginButton.isEnabled();
  }

  // Utility methods
  async clearForm() {
    await this.emailInput.clear();
    await this.passwordInput.clear();
    
    if (await this.rememberMeCheckbox.isChecked()) {
      await this.rememberMeCheckbox.uncheck();
    }
  }

  async fillForm(email, password, rememberMe = false) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    
    if (rememberMe) {
      await this.rememberMeCheckbox.check();
    }
  }

  async submitForm() {
    await this.loginButton.click();
  }

  // Navigation helpers
  async goToForgotPassword() {
    await this.forgotPasswordLink.click();
  }

  async goToSignup() {
    await this.signupLink.click();
  }

  // Wait helpers
  async waitForLoginComplete(timeout = 10000) {
    // Wait for successful login (redirect away from login page)
    await this.page.waitForFunction(
      () => !window.location.pathname.includes('/login'),
      { timeout }
    );
  }

  async waitForLoginError(timeout = 5000) {
    await this.errorMessage.waitFor({ state: 'visible', timeout });
  }
}