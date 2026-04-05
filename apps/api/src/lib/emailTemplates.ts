"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationSubmittedTemplate = applicationSubmittedTemplate;
exports.applicationReceivedConfirmation = applicationReceivedConfirmation;
exports.applicationStatusChangedTemplate = applicationStatusChangedTemplate;
exports.interviewScheduledTemplate = interviewScheduledTemplate;
function applicationSubmittedTemplate(params) {
    const subject = `New application — ${params.jobTitle}`;
    const text = `A new application was submitted for ${params.jobTitle} by ${params.applicantEmail || 'an applicant'}.`;
    const html = `
  <div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color: #111;">
    <h2 style="margin:0 0 8px 0;">New application</h2>
    <p style="margin:0 0 10px 0;">A new application was submitted for <strong>${params.jobTitle}</strong> ${params.companyName ? `at <strong>${params.companyName}</strong>` : ''}.</p>
    <p style="margin:0 0 6px 0;">Applicant: <strong>${params.applicantEmail || 'anonymous'}</strong></p>
    ${params.resumeUrl ? `<p style="margin:0 0 6px 0;">Resume: <a href="${params.resumeUrl}">Download</a></p>` : ''}
    <hr style="margin:12px 0" />
    <small style="color:#777">Manage applications in the company dashboard.</small>
  </div>
  `;
    return { subject, text, html };
}
function applicationReceivedConfirmation(params) {
    const subject = `Application received — ${params.jobTitle}`;
    const text = `Thanks — your application for ${params.jobTitle} was received.`;
    const html = `<div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial; color:#111;"><p>Thanks — your application for <strong>${params.jobTitle}</strong> was received. The company will be in touch if you progress.</p></div>`;
    return { subject, text, html };
}
function applicationStatusChangedTemplate(params) {
    const subject = `Update: ${params.jobTitle} — ${params.newStatus}`;
    const text = `Your application status has been updated to ${params.newStatus} for ${params.jobTitle}.`;
    const html = `<div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial; color:#111;"><p>Your application status has been updated to <strong>${params.newStatus}</strong> for <strong>${params.jobTitle}</strong>.</p></div>`;
    return { subject, text, html };
}
function interviewScheduledTemplate(params) {
    const subject = `Interview scheduled — ${params.jobTitle}`;
    const text = `An interview has been scheduled for ${params.jobTitle} at ${params.when}.`;
    const html = `
  <div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial; color:#111;">
    <h2 style="margin:0 0 8px 0">Interview scheduled</h2>
    <p style="margin:0 0 8px 0">An interview has been scheduled for <strong>${params.jobTitle}</strong>.</p>
    <p style="margin:0 0 6px 0">When: <strong>${params.when}</strong></p>
    ${params.location ? `<p style="margin:0 0 6px 0">Location: <strong>${params.location}</strong></p>` : ''}
    <hr style="margin:12px 0" />
    <small style="color:#777">You can add this to your calendar using the attached invite.</small>
  </div>
  `;
    return { subject, text, html };
}

export function paymentFailedTemplate(params) {
    const subject = `Action required: Payment failed for your subscription`;
    const amount = params.amount ? `$${(params.amount / 100).toFixed(2)}` : 'your subscription';
    const text = `Your payment of ${amount} failed. Please update your payment method to continue your subscription.`;
    const html = `
  <div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial; color:#111; max-width:600px; margin:0 auto;">
    <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 16px; margin-bottom: 20px;">
      <h2 style="margin:0 0 8px 0; color: #991b1b;">Payment Failed</h2>
      <p style="margin:0; color: #7f1d1d;">We were unable to process your payment of <strong>${amount}</strong>.</p>
    </div>
    
    <p style="margin:0 0 16px 0;">To keep your subscription active and continue using premium features, please update your payment method.</p>
    
    <div style="margin: 24px 0;">
      <a href="${params.invoiceUrl || params.billingUrl || '#'}" 
         style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
        Update Payment Method
      </a>
    </div>
    
    <p style="margin:16px 0 8px 0; color: #666;">What happens next?</p>
    <ul style="margin:0 0 16px 0; padding-left: 20px; color: #666;">
      <li>We'll retry the payment automatically in a few days</li>
      <li>Your subscription remains active during the grace period</li>
      <li>If payment continues to fail, your account will be downgraded to Free</li>
    </ul>
    
    <hr style="margin:24px 0; border: none; border-top: 1px solid #e5e7eb;" />
    <p style="margin:0; color:#777; font-size: 12px;">
      If you have questions, contact us at support@ngurra.example<br/>
      <a href="${params.billingUrl || '#'}" style="color: #3b82f6;">Manage your billing settings</a>
    </p>
  </div>
  `;
    return { subject, text, html };
}

/**
 * Password reset email template
 */
function passwordResetTemplate(params) {
    const subject = 'Reset your Ngurra Pathways password';
    const resetUrl = params.resetUrl || `${params.baseUrl}/reset-password?token=${params.token}`;
    const text = `You requested a password reset for your Ngurra Pathways account. Click this link to reset your password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can safely ignore this email.`;
    const html = `
  <div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial; color:#111; max-width:600px; margin:0 auto;">
    <div style="background: linear-gradient(135deg, #1A0F2E, #2D1B69); padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="margin:0; color: #FFD700; font-size: 24px;">Ngurra Pathways</h1>
    </div>
    
    <div style="background: #fff; padding: 32px; border: 1px solid #e5e7eb; border-top: none;">
      <h2 style="margin:0 0 16px 0; color: #1A0F2E;">Reset Your Password</h2>
      <p style="margin:0 0 24px 0; color: #374151;">
        We received a request to reset the password for your account. Click the button below to create a new password.
      </p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" 
           style="display: inline-block; background: linear-gradient(135deg, #6B4C9A, #3D1A2A); color: #FFD700; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
          Reset Password
        </a>
      </div>
      
      <p style="margin:24px 0 8px 0; color: #6b7280; font-size: 14px;">
        This link will expire in <strong>1 hour</strong>.
      </p>
      <p style="margin:0; color: #6b7280; font-size: 14px;">
        If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
      </p>
    </div>
    
    <div style="background: #f9fafb; padding: 16px; text-align: center; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
      <p style="margin:0; color:#9ca3af; font-size: 12px;">
        © ${new Date().getFullYear()} Ngurra Pathways. Supporting First Nations futures.
      </p>
    </div>
  </div>
  `;
    return { subject, text, html };
}

/**
 * Contact form confirmation email template
 */
export function contactConfirmationTemplate(params: any) {
    const subject = `We received your message — ${params.subject}`;
    const text = `Hi ${params.name},\n\nThanks for reaching out! We've received your message about "${params.subject}" and our team will respond within 24-48 hours.\n\nReference: ${params.id}\n\n— The Ngurra Pathways Team`;
    const html = `
  <div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial; color:#111; max-width:600px; margin:0 auto;">
    <div style="background: linear-gradient(135deg, #1A0F2E, #2D1B69); padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="margin:0; color: #FFD700; font-size: 24px;">Ngurra Pathways</h1>
    </div>
    
    <div style="background: #fff; padding: 32px; border: 1px solid #e5e7eb; border-top: none;">
      <h2 style="margin:0 0 16px 0; color: #1A0F2E;">Message Received ✓</h2>
      <p style="margin:0 0 16px 0; color: #374151;">
        Hi <strong>${params.name}</strong>,
      </p>
      <p style="margin:0 0 24px 0; color: #374151;">
        Thanks for contacting us! We've received your message about <strong>"${params.subject}"</strong> and our team will respond within 24-48 hours.
      </p>
      
      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
        <p style="margin:0 0 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Reference Number</p>
        <p style="margin:0; color: #1A0F2E; font-weight: 600;">${params.id}</p>
      </div>
      
      <p style="margin:0; color: #6b7280; font-size: 14px;">
        Need urgent help? Check our <a href="${params.baseUrl || 'https://ngurrapathways.com.au'}/help" style="color: #6B4C9A;">Help Center</a>.
      </p>
    </div>
    
    <div style="background: #f9fafb; padding: 16px; text-align: center; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
      <p style="margin:0; color:#9ca3af; font-size: 12px;">
        © ${new Date().getFullYear()} Ngurra Pathways. Supporting First Nations futures.
      </p>
    </div>
  </div>
  `;
    return { subject, text, html };
}

/**
 * Contact form notification to support team
 */
export function contactNotificationTemplate(params: any) {
    const subject = `[Contact Form] ${params.department}: ${params.subject}`;
    const text = `New contact form submission:\n\nFrom: ${params.name} <${params.email}>\nDepartment: ${params.department}\nSubject: ${params.subject}\n\nMessage:\n${params.message}\n\nSubmission ID: ${params.id}`;
    const html = `
  <div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial; color:#111; max-width:600px;">
    <div style="background: #1A0F2E; color: #FFD700; padding: 16px; border-radius: 8px 8px 0 0;">
      <h2 style="margin:0;">📬 New Contact Form Submission</h2>
    </div>
    
    <div style="background: #fff; padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 100px;">From:</td>
          <td style="padding: 8px 0; color: #111;">${params.name} &lt;${params.email}&gt;</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Department:</td>
          <td style="padding: 8px 0;"><span style="background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${params.department}</span></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Subject:</td>
          <td style="padding: 8px 0; color: #111; font-weight: 600;">${params.subject}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">ID:</td>
          <td style="padding: 8px 0; color: #6b7280; font-family: monospace;">${params.id}</td>
        </tr>
      </table>
      
      <hr style="margin: 16px 0; border: none; border-top: 1px solid #e5e7eb;" />
      
      <h3 style="margin: 0 0 12px 0; color: #374151;">Message:</h3>
      <div style="background: #f9fafb; padding: 16px; border-radius: 8px; white-space: pre-wrap; color: #374151;">
${params.message}
      </div>
    </div>
  </div>
  `;
    return { subject, text, html };
}

/**
 * Advertising inquiry confirmation email
 */
export function advertisingConfirmationTemplate(params) {
    const subject = `Thanks for your interest in advertising with Ngurra Pathways`;
    const text = `Hi ${params.contactName},\n\nThanks for your advertising inquiry! Our partnerships team will review your request and contact you within 24-48 hours.\n\nCompany: ${params.companyName}\nSelected Plan: ${params.selectedPlan || 'Not specified'}\nReference: ${params.id}\n\n— The Ngurra Pathways Partnerships Team`;
    const html = `
  <div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial; color:#111; max-width:600px; margin:0 auto;">
    <div style="background: linear-gradient(135deg, #1A0F2E, #2D1B69); padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="margin:0; color: #FFD700; font-size: 24px;">Ngurra Pathways</h1>
      <p style="margin: 8px 0 0 0; color: rgba(255,215,0,0.7); font-size: 14px;">Partnerships & Advertising</p>
    </div>
    
    <div style="background: #fff; padding: 32px; border: 1px solid #e5e7eb; border-top: none;">
      <h2 style="margin:0 0 16px 0; color: #1A0F2E;">Thanks for Your Interest! 🎉</h2>
      <p style="margin:0 0 16px 0; color: #374151;">
        Hi <strong>${params.contactName}</strong>,
      </p>
      <p style="margin:0 0 24px 0; color: #374151;">
        We've received your advertising inquiry for <strong>${params.companyName}</strong>. Our partnerships team will review your request and contact you within 24-48 hours.
      </p>
      
      <div style="background: linear-gradient(135deg, rgba(255,215,0,0.1), rgba(80,200,120,0.1)); padding: 20px; border-radius: 8px; margin-bottom: 24px;">
        <h3 style="margin:0 0 12px 0; color: #1A0F2E;">Your Inquiry Details</h3>
        <table style="width: 100%;">
          <tr>
            <td style="padding: 4px 0; color: #6b7280;">Company:</td>
            <td style="padding: 4px 0; color: #111; font-weight: 500;">${params.companyName}</td>
          </tr>
          ${params.selectedPlan ? `<tr><td style="padding: 4px 0; color: #6b7280;">Plan:</td><td style="padding: 4px 0; color: #111; font-weight: 500;">${params.selectedPlan}</td></tr>` : ''}
          ${params.budget ? `<tr><td style="padding: 4px 0; color: #6b7280;">Budget:</td><td style="padding: 4px 0; color: #111; font-weight: 500;">${params.budget}</td></tr>` : ''}
          <tr>
            <td style="padding: 4px 0; color: #6b7280;">Reference:</td>
            <td style="padding: 4px 0; color: #6b7280; font-family: monospace;">${params.id}</td>
          </tr>
        </table>
      </div>
      
      <p style="margin:0; color: #6b7280; font-size: 14px;">
        Questions? Reply to this email or contact partnerships@ngurrapathways.com.au
      </p>
    </div>
    
    <div style="background: #f9fafb; padding: 16px; text-align: center; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
      <p style="margin:0; color:#9ca3af; font-size: 12px;">
        © ${new Date().getFullYear()} Ngurra Pathways. Supporting First Nations futures.
      </p>
    </div>
  </div>
  `;
    return { subject, text, html };
}

/**
 * Advertising inquiry notification to partnerships team
 */
export function advertisingNotificationTemplate(params) {
    const subject = `[Advertising Inquiry] ${params.companyName} — ${params.selectedPlan || 'General Inquiry'}`;
    const goals = Array.isArray(params.goals) ? params.goals.join(', ') : params.goals;
    const text = `New advertising inquiry:\n\nCompany: ${params.companyName}\nContact: ${params.contactName} <${params.email}>\nPhone: ${params.phone || 'Not provided'}\nWebsite: ${params.website || 'Not provided'}\nPlan: ${params.selectedPlan || 'Not specified'}\nBudget: ${params.budget || 'Not specified'}\nGoals: ${goals || 'Not specified'}\n\nMessage:\n${params.message || 'No message'}\n\nInquiry ID: ${params.id}`;
    const html = `
  <div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial; color:#111; max-width:600px;">
    <div style="background: linear-gradient(135deg, #FFD700, #50C878); color: #1A0F2E; padding: 16px; border-radius: 8px 8px 0 0;">
      <h2 style="margin:0;">💰 New Advertising Inquiry</h2>
    </div>
    
    <div style="background: #fff; padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="margin:0; color: #1A0F2E;">${params.companyName}</h3>
        ${params.selectedPlan ? `<span style="background: #50C878; color: white; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 600;">${params.selectedPlan}</span>` : ''}
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 100px;">Contact:</td>
          <td style="padding: 8px 0; color: #111;">${params.contactName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Email:</td>
          <td style="padding: 8px 0;"><a href="mailto:${params.email}" style="color: #6B4C9A;">${params.email}</a></td>
        </tr>
        ${params.phone ? `<tr><td style="padding: 8px 0; color: #6b7280;">Phone:</td><td style="padding: 8px 0; color: #111;">${params.phone}</td></tr>` : ''}
        ${params.website ? `<tr><td style="padding: 8px 0; color: #6b7280;">Website:</td><td style="padding: 8px 0;"><a href="${params.website}" style="color: #6B4C9A;">${params.website}</a></td></tr>` : ''}
        ${params.budget ? `<tr><td style="padding: 8px 0; color: #6b7280;">Budget:</td><td style="padding: 8px 0; color: #111; font-weight: 600;">${params.budget}</td></tr>` : ''}
      </table>
      
      ${goals ? `
      <div style="margin-bottom: 16px;">
        <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Goals</p>
        <p style="margin: 0; color: #111;">${goals}</p>
      </div>
      ` : ''}
      
      ${params.message ? `
      <hr style="margin: 16px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <h4 style="margin: 0 0 8px 0; color: #374151;">Message:</h4>
      <div style="background: #f9fafb; padding: 12px; border-radius: 8px; color: #374151;">
        ${params.message}
      </div>
      ` : ''}
      
      <hr style="margin: 16px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">Inquiry ID: ${params.id}</p>
    </div>
  </div>
  `;
    return { subject, text, html };
}

exports.paymentFailedTemplate = paymentFailedTemplate;
exports.passwordResetTemplate = passwordResetTemplate;
exports.contactConfirmationTemplate = contactConfirmationTemplate;
exports.contactNotificationTemplate = contactNotificationTemplate;
exports.advertisingConfirmationTemplate = advertisingConfirmationTemplate;
exports.advertisingNotificationTemplate = advertisingNotificationTemplate;

// ============================================
// STEP 41: Additional Email Templates
// ============================================

/**
 * Welcome email for new users
 */
function welcomeTemplate(params) {
    const subject = `Welcome to Ngurra Pathways, ${params.name}!`;
    const text = `Welcome to Ngurra Pathways, ${params.name}!\n\nYour account has been created successfully. You can now:\n- Browse and apply for jobs\n- Connect with mentors\n- Access training courses\n- Join our community\n\nGet started: ${params.dashboardUrl || 'https://ngurrapathways.com.au/dashboard'}\n\n— The Ngurra Pathways Team`;
    const html = `
  <div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial; color:#111; max-width:600px; margin:0 auto;">
    <div style="background: linear-gradient(135deg, #1A0F2E, #2D1B69); padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="margin:0 0 8px 0; color: #FFD700; font-size: 28px;">Welcome to Ngurra Pathways</h1>
      <p style="margin:0; color: rgba(255,215,0,0.8); font-size: 16px;">Your journey starts here</p>
    </div>
    
    <div style="background: #fff; padding: 32px; border: 1px solid #e5e7eb; border-top: none;">
      <h2 style="margin:0 0 16px 0; color: #1A0F2E;">G'day ${params.name}! 👋</h2>
      <p style="margin:0 0 24px 0; color: #374151;">
        Your Ngurra Pathways account is ready. We're excited to support you on your career journey.
      </p>
      
      <h3 style="margin:0 0 16px 0; color: #1A0F2E; font-size: 16px;">Here's what you can do:</h3>
      
      <div style="margin-bottom: 24px;">
        <div style="display: flex; align-items: center; margin-bottom: 12px;">
          <span style="background: #FFD700; color: #1A0F2E; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; font-weight: 600;">1</span>
          <span style="color: #374151;"><strong>Complete your profile</strong> — Help employers find you</span>
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 12px;">
          <span style="background: #FFD700; color: #1A0F2E; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; font-weight: 600;">2</span>
          <span style="color: #374151;"><strong>Browse jobs</strong> — Find opportunities that match your skills</span>
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 12px;">
          <span style="background: #FFD700; color: #1A0F2E; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; font-weight: 600;">3</span>
          <span style="color: #374151;"><strong>Connect with mentors</strong> — Get guidance from experienced professionals</span>
        </div>
        <div style="display: flex; align-items: center;">
          <span style="background: #FFD700; color: #1A0F2E; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; font-weight: 600;">4</span>
          <span style="color: #374151;"><strong>Explore courses</strong> — Build new skills with training providers</span>
        </div>
      </div>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${params.dashboardUrl || 'https://ngurrapathways.com.au/dashboard'}" 
           style="display: inline-block; background: linear-gradient(135deg, #6B4C9A, #3D1A2A); color: #FFD700; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
          Go to Dashboard
        </a>
      </div>
      
      <p style="margin:0; color: #6b7280; font-size: 14px; text-align: center;">
        Need help? Check out our <a href="${params.baseUrl || 'https://ngurrapathways.com.au'}/help" style="color: #6B4C9A;">Help Center</a> or reply to this email.
      </p>
    </div>
    
    <div style="background: #f9fafb; padding: 16px; text-align: center; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
      <p style="margin:0; color:#9ca3af; font-size: 12px;">
        © ${new Date().getFullYear()} Ngurra Pathways. Supporting First Nations futures.
      </p>
    </div>
  </div>
  `;
    return { subject, text, html };
}

/**
 * Email verification template
 */
function verificationTemplate(params) {
    const subject = 'Verify your email address';
    const verifyUrl = params.verifyUrl || `${params.baseUrl}/verify-email?token=${params.token}`;
    const text = `Please verify your email address by clicking this link: ${verifyUrl}\n\nThis link expires in 24 hours.`;
    const html = `
  <div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial; color:#111; max-width:600px; margin:0 auto;">
    <div style="background: linear-gradient(135deg, #1A0F2E, #2D1B69); padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="margin:0; color: #FFD700; font-size: 24px;">Ngurra Pathways</h1>
    </div>
    
    <div style="background: #fff; padding: 32px; border: 1px solid #e5e7eb; border-top: none;">
      <h2 style="margin:0 0 16px 0; color: #1A0F2E;">Verify Your Email</h2>
      <p style="margin:0 0 24px 0; color: #374151;">
        Click the button below to verify your email address and complete your registration.
      </p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${verifyUrl}" 
           style="display: inline-block; background: #50C878; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
          Verify Email Address
        </a>
      </div>
      
      <p style="margin:0; color: #6b7280; font-size: 14px;">
        This link will expire in <strong>24 hours</strong>. If you didn't create an account, you can safely ignore this email.
      </p>
    </div>
    
    <div style="background: #f9fafb; padding: 16px; text-align: center; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
      <p style="margin:0; color:#9ca3af; font-size: 12px;">
        © ${new Date().getFullYear()} Ngurra Pathways. Supporting First Nations futures.
      </p>
    </div>
  </div>
  `;
    return { subject, text, html };
}

/**
 * Job alert email template
 */
function jobAlertTemplate(params) {
    const subject = `${params.matchCount} new job${params.matchCount > 1 ? 's' : ''} matching "${params.searchName}"`;
    const jobsList = params.jobs.map(job => `- ${job.title} at ${job.company} (${job.location})`).join('\n');
    const text = `Hi ${params.name},\n\nWe found ${params.matchCount} new job${params.matchCount > 1 ? 's' : ''} matching your saved search "${params.searchName}":\n\n${jobsList}\n\nView all matches: ${params.searchUrl}\n\nTo manage your job alerts, visit your settings.`;
    
    const jobsHtml = params.jobs.map(job => `
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
        <h3 style="margin: 0 0 4px 0; color: #1A0F2E;">${job.title}</h3>
        <p style="margin: 0 0 8px 0; color: #6b7280;">${job.company} • ${job.location}</p>
        ${job.salary ? `<p style="margin: 0 0 8px 0; color: #50C878; font-weight: 600;">${job.salary}</p>` : ''}
        <a href="${job.url}" style="color: #6B4C9A; font-size: 14px;">View Job →</a>
      </div>
    `).join('');
    
    const html = `
  <div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial; color:#111; max-width:600px; margin:0 auto;">
    <div style="background: linear-gradient(135deg, #1A0F2E, #2D1B69); padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="margin:0; color: #FFD700; font-size: 24px;">🔔 Job Alert</h1>
    </div>
    
    <div style="background: #fff; padding: 32px; border: 1px solid #e5e7eb; border-top: none;">
      <p style="margin:0 0 8px 0; color: #374151;">Hi ${params.name},</p>
      <p style="margin:0 0 24px 0; color: #374151;">
        We found <strong>${params.matchCount} new job${params.matchCount > 1 ? 's' : ''}</strong> matching your saved search "<strong>${params.searchName}</strong>":
      </p>
      
      ${jobsHtml}
      
      <div style="text-align: center; margin: 24px 0;">
        <a href="${params.searchUrl}" 
           style="display: inline-block; background: linear-gradient(135deg, #6B4C9A, #3D1A2A); color: #FFD700; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
          View All Matches
        </a>
      </div>
    </div>
    
    <div style="background: #f9fafb; padding: 16px; text-align: center; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
      <p style="margin:0 0 8px 0; color:#9ca3af; font-size: 12px;">
        <a href="${params.unsubscribeUrl}" style="color: #6b7280;">Manage alerts</a> • <a href="${params.unsubscribeUrl}" style="color: #6b7280;">Unsubscribe</a>
      </p>
      <p style="margin:0; color:#9ca3af; font-size: 12px;">
        © ${new Date().getFullYear()} Ngurra Pathways
      </p>
    </div>
  </div>
  `;
    return { subject, text, html };
}

/**
 * Session reminder email template
 */
function sessionReminderTemplate(params) {
    const subject = `Reminder: Mentorship session ${params.timeUntil}`;
    const text = `Hi ${params.name},\n\nThis is a reminder that you have a mentorship session scheduled ${params.timeUntil}.\n\nSession details:\n- With: ${params.otherPartyName}\n- When: ${params.sessionTime}\n- Topic: ${params.topic || 'General mentorship'}\n${params.videoUrl ? `- Join: ${params.videoUrl}` : ''}\n\nSee you soon!`;
    const html = `
  <div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial; color:#111; max-width:600px; margin:0 auto;">
    <div style="background: linear-gradient(135deg, #6B4C9A, #1A0F2E); padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="margin:0; color: #FFD700; font-size: 24px;">⏰ Session Reminder</h1>
    </div>
    
    <div style="background: #fff; padding: 32px; border: 1px solid #e5e7eb; border-top: none;">
      <p style="margin:0 0 8px 0; color: #374151;">Hi ${params.name},</p>
      <p style="margin:0 0 24px 0; color: #374151;">
        Your mentorship session is coming up <strong>${params.timeUntil}</strong>.
      </p>
      
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
        <table style="width: 100%;">
          <tr>
            <td style="padding: 6px 0; color: #6b7280;">With:</td>
            <td style="padding: 6px 0; color: #111; font-weight: 600;">${params.otherPartyName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280;">When:</td>
            <td style="padding: 6px 0; color: #111; font-weight: 600;">${params.sessionTime}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280;">Topic:</td>
            <td style="padding: 6px 0; color: #111;">${params.topic || 'General mentorship'}</td>
          </tr>
        </table>
      </div>
      
      ${params.videoUrl ? `
      <div style="text-align: center; margin: 24px 0;">
        <a href="${params.videoUrl}" 
           style="display: inline-block; background: #50C878; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
          Join Video Call
        </a>
      </div>
      ` : ''}
      
      <p style="margin:0; color: #6b7280; font-size: 14px; text-align: center;">
        Need to reschedule? <a href="${params.rescheduleUrl || '#'}" style="color: #6B4C9A;">Click here</a>
      </p>
    </div>
    
    <div style="background: #f9fafb; padding: 16px; text-align: center; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
      <p style="margin:0; color:#9ca3af; font-size: 12px;">
        © ${new Date().getFullYear()} Ngurra Pathways
      </p>
    </div>
  </div>
  `;
    return { subject, text, html };
}

/**
 * Course enrollment confirmation template
 */
function courseEnrollmentTemplate(params) {
    const subject = `Enrolled: ${params.courseTitle}`;
    const text = `Hi ${params.name},\n\nYou're now enrolled in "${params.courseTitle}"!\n\nCourse details:\n- Provider: ${params.provider}\n- Duration: ${params.duration}\n- Start Date: ${params.startDate || 'Self-paced'}\n\nAccess your course: ${params.courseUrl}\n\nGood luck with your learning!`;
    const html = `
  <div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial; color:#111; max-width:600px; margin:0 auto;">
    <div style="background: linear-gradient(135deg, #50C878, #1A0F2E); padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="margin:0; color: #FFD700; font-size: 24px;">🎓 You're Enrolled!</h1>
    </div>
    
    <div style="background: #fff; padding: 32px; border: 1px solid #e5e7eb; border-top: none;">
      <p style="margin:0 0 8px 0; color: #374151;">Hi ${params.name},</p>
      <p style="margin:0 0 24px 0; color: #374151;">
        Congratulations! You're now enrolled in <strong>"${params.courseTitle}"</strong>.
      </p>
      
      <div style="background: linear-gradient(135deg, rgba(80,200,120,0.1), rgba(107,76,154,0.1)); padding: 20px; border-radius: 8px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px 0; color: #1A0F2E;">Course Details</h3>
        <table style="width: 100%;">
          <tr>
            <td style="padding: 6px 0; color: #6b7280;">Provider:</td>
            <td style="padding: 6px 0; color: #111;">${params.provider}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280;">Duration:</td>
            <td style="padding: 6px 0; color: #111;">${params.duration}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280;">Start Date:</td>
            <td style="padding: 6px 0; color: #111;">${params.startDate || 'Self-paced'}</td>
          </tr>
        </table>
      </div>
      
      <div style="text-align: center; margin: 24px 0;">
        <a href="${params.courseUrl}" 
           style="display: inline-block; background: linear-gradient(135deg, #6B4C9A, #3D1A2A); color: #FFD700; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
          Start Learning
        </a>
      </div>
      
      <p style="margin:0; color: #6b7280; font-size: 14px; text-align: center;">
        Track your progress in your <a href="${params.dashboardUrl || '#'}" style="color: #6B4C9A;">dashboard</a>.
      </p>
    </div>
    
    <div style="background: #f9fafb; padding: 16px; text-align: center; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
      <p style="margin:0; color:#9ca3af; font-size: 12px;">
        © ${new Date().getFullYear()} Ngurra Pathways
      </p>
    </div>
  </div>
  `;
    return { subject, text, html };
}

/**
 * Weekly digest email template
 */
function weeklyDigestTemplate(params) {
    const subject = `Your weekly update from Ngurra Pathways`;
    const text = `Hi ${params.name},\n\nHere's what happened this week:\n\n- ${params.newJobs} new jobs posted\n- ${params.newCourses} new courses available\n${params.applicationUpdates > 0 ? `- ${params.applicationUpdates} updates on your applications\n` : ''}\n\nTop job matches:\n${params.topJobs.map(j => `- ${j.title} at ${j.company}`).join('\n')}\n\nView your dashboard: ${params.dashboardUrl}`;
    
    const topJobsHtml = params.topJobs.slice(0, 3).map(job => `
      <div style="border-bottom: 1px solid #e5e7eb; padding: 12px 0;">
        <a href="${job.url}" style="color: #1A0F2E; text-decoration: none; font-weight: 600;">${job.title}</a>
        <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">${job.company} • ${job.location}</p>
      </div>
    `).join('');
    
    const html = `
  <div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial; color:#111; max-width:600px; margin:0 auto;">
    <div style="background: linear-gradient(135deg, #1A0F2E, #2D1B69); padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="margin:0; color: #FFD700; font-size: 24px;">📬 Weekly Update</h1>
      <p style="margin: 8px 0 0 0; color: rgba(255,215,0,0.7);">${params.weekRange}</p>
    </div>
    
    <div style="background: #fff; padding: 32px; border: 1px solid #e5e7eb; border-top: none;">
      <p style="margin:0 0 24px 0; color: #374151;">Hi ${params.name}, here's your weekly update:</p>
      
      <!-- Stats Grid -->
      <div style="display: flex; gap: 12px; margin-bottom: 24px;">
        <div style="flex: 1; background: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center;">
          <p style="margin: 0; color: #6B4C9A; font-size: 28px; font-weight: 700;">${params.newJobs}</p>
          <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 12px;">New Jobs</p>
        </div>
        <div style="flex: 1; background: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center;">
          <p style="margin: 0; color: #50C878; font-size: 28px; font-weight: 700;">${params.newCourses}</p>
          <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 12px;">New Courses</p>
        </div>
        ${params.applicationUpdates > 0 ? `
        <div style="flex: 1; background: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center;">
          <p style="margin: 0; color: #FFD700; font-size: 28px; font-weight: 700;">${params.applicationUpdates}</p>
          <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 12px;">App Updates</p>
        </div>
        ` : ''}
      </div>
      
      <!-- Top Job Matches -->
      <h3 style="margin: 0 0 12px 0; color: #1A0F2E;">Top Job Matches</h3>
      ${topJobsHtml}
      
      <div style="text-align: center; margin: 24px 0;">
        <a href="${params.dashboardUrl}" 
           style="display: inline-block; background: linear-gradient(135deg, #6B4C9A, #3D1A2A); color: #FFD700; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
          View Dashboard
        </a>
      </div>
    </div>
    
    <div style="background: #f9fafb; padding: 16px; text-align: center; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
      <p style="margin:0 0 8px 0; color:#9ca3af; font-size: 12px;">
        <a href="${params.preferencesUrl}" style="color: #6b7280;">Email preferences</a> • <a href="${params.unsubscribeUrl}" style="color: #6b7280;">Unsubscribe</a>
      </p>
      <p style="margin:0; color:#9ca3af; font-size: 12px;">
        © ${new Date().getFullYear()} Ngurra Pathways
      </p>
    </div>
  </div>
  `;
    return { subject, text, html };
}

/**
 * Subscription confirmation template
 */
function subscriptionConfirmationTemplate(params) {
    const subject = `Welcome to ${params.planName}!`;
    const text = `Thanks for subscribing to ${params.planName}!\n\nYour subscription is now active. You have access to:\n${params.features.map(f => `- ${f}`).join('\n')}\n\nManage your subscription: ${params.billingUrl}\n\n— The Ngurra Pathways Team`;
    const featuresHtml = params.features.map(f => `<li style="margin-bottom: 8px;">${f}</li>`).join('');
    const html = `
  <div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial; color:#111; max-width:600px; margin:0 auto;">
    <div style="background: linear-gradient(135deg, #FFD700, #50C878); padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="margin:0; color: #1A0F2E; font-size: 28px;">🎉 Welcome to ${params.planName}!</h1>
    </div>
    
    <div style="background: #fff; padding: 32px; border: 1px solid #e5e7eb; border-top: none;">
      <p style="margin:0 0 24px 0; color: #374151;">
        Thanks for subscribing! Your <strong>${params.planName}</strong> subscription is now active.
      </p>
      
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px 0; color: #1A0F2E;">You now have access to:</h3>
        <ul style="margin: 0; padding-left: 20px; color: #374151;">
          ${featuresHtml}
        </ul>
      </div>
      
      <table style="width: 100%; margin-bottom: 24px;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Plan:</td>
          <td style="padding: 8px 0; color: #111; font-weight: 600;">${params.planName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Amount:</td>
          <td style="padding: 8px 0; color: #111; font-weight: 600;">${params.amount}/month</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Next billing:</td>
          <td style="padding: 8px 0; color: #111;">${params.nextBillingDate}</td>
        </tr>
      </table>
      
      <div style="text-align: center;">
        <a href="${params.billingUrl}" 
           style="display: inline-block; background: linear-gradient(135deg, #6B4C9A, #3D1A2A); color: #FFD700; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
          Manage Subscription
        </a>
      </div>
    </div>
    
    <div style="background: #f9fafb; padding: 16px; text-align: center; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
      <p style="margin:0; color:#9ca3af; font-size: 12px;">
        © ${new Date().getFullYear()} Ngurra Pathways
      </p>
    </div>
  </div>
  `;
    return { subject, text, html };
}

/**
 * New application notification for employers
 */
function newApplicationTemplate(params) {
    const subject = `New Application: ${params.jobTitle}`;
    const text = `${params.applicantName} has applied for ${params.jobTitle}. Review their application at ${params.applicationUrl}`;
    const html = `
  <div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial; color:#111; max-width:600px; margin:0 auto;">
    <div style="background: linear-gradient(135deg, #1A0F2E, #2D1B69); padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="margin:0; color: #FFD700; font-size: 24px;">New Application</h1>
    </div>
    
    <div style="background: #fff; padding: 32px; border: 1px solid #e5e7eb; border-top: none;">
      <p style="margin:0 0 16px 0; font-size: 16px;">Hi ${params.recipientName || 'there'},</p>
      
      <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin-bottom: 24px;">
        <p style="margin:0; color: #166534; font-weight: 600;">
          ${params.applicantName} has applied for <strong>${params.jobTitle}</strong>
        </p>
      </div>
      
      <div style="text-align: center; margin: 24px 0;">
        <a href="${params.applicationUrl}" 
           style="display: inline-block; background: linear-gradient(135deg, #6B4C9A, #3D1A2A); color: #FFD700; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">
          Review Application
        </a>
      </div>
      
      <p style="margin:0; color:#6b7280; font-size: 14px; text-align: center;">
        Don't keep applicants waiting — review applications promptly for the best candidates.
      </p>
    </div>
    
    <div style="background: #f9fafb; padding: 16px; text-align: center; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
      <p style="margin:0; color:#9ca3af; font-size: 12px;">
        © ${new Date().getFullYear()} Ngurra Pathways
      </p>
    </div>
  </div>
  `;
    return { subject, text, html };
}

/**
 * Application status update notification for applicants
 */
function applicationStatusUpdateTemplate(params) {
    const statusColors = {
        reviewed: '#3b82f6',
        shortlisted: '#22c55e',
        interview: '#f59e0b',
        offered: '#10b981',
        rejected: '#ef4444',
        withdrawn: '#6b7280'
    };
    const color = statusColors[params.status] || '#6b7280';
    
    const subject = `${params.statusMessage || 'Application Update'} - ${params.jobTitle}`;
    const text = `Your application for ${params.jobTitle} at ${params.companyName} has been updated. Status: ${params.status}. ${params.notes ? `Note: ${params.notes}` : ''} View details: ${params.applicationUrl}`;
    const html = `
  <div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial; color:#111; max-width:600px; margin:0 auto;">
    <div style="background: linear-gradient(135deg, #1A0F2E, #2D1B69); padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="margin:0; color: #FFD700; font-size: 24px;">Application Update</h1>
    </div>
    
    <div style="background: #fff; padding: 32px; border: 1px solid #e5e7eb; border-top: none;">
      <p style="margin:0 0 16px 0; font-size: 16px;">Hi ${params.recipientName || 'there'},</p>
      
      <div style="background: ${color}15; border-left: 4px solid ${color}; padding: 16px; margin-bottom: 24px;">
        <p style="margin:0 0 8px 0; color: ${color}; font-weight: 600; font-size: 18px;">
          ${params.statusMessage || 'Status Updated'}
        </p>
        <p style="margin:0; color: #374151;">
          <strong>${params.jobTitle}</strong> at ${params.companyName}
        </p>
      </div>
      
      ${params.notes ? `
      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
        <p style="margin:0 0 4px 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Note from employer</p>
        <p style="margin:0; color: #374151;">${params.notes}</p>
      </div>
      ` : ''}
      
      <div style="text-align: center; margin: 24px 0;">
        <a href="${params.applicationUrl}" 
           style="display: inline-block; background: linear-gradient(135deg, #6B4C9A, #3D1A2A); color: #FFD700; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">
          View Application
        </a>
      </div>
    </div>
    
    <div style="background: #f9fafb; padding: 16px; text-align: center; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
      <p style="margin:0; color:#9ca3af; font-size: 12px;">
        © ${new Date().getFullYear()} Ngurra Pathways
      </p>
    </div>
  </div>
  `;
    return { subject, text, html };
}

// Export new templates
exports.newApplicationTemplate = newApplicationTemplate;
exports.applicationStatusUpdateTemplate = applicationStatusUpdateTemplate;
exports.welcomeTemplate = welcomeTemplate;
exports.verificationTemplate = verificationTemplate;
exports.jobAlertTemplate = jobAlertTemplate;
exports.sessionReminderTemplate = sessionReminderTemplate;
exports.courseEnrollmentTemplate = courseEnrollmentTemplate;
exports.weeklyDigestTemplate = weeklyDigestTemplate;
exports.subscriptionConfirmationTemplate = subscriptionConfirmationTemplate;

exports.default = { 
    applicationSubmittedTemplate, 
    applicationReceivedConfirmation, 
    applicationStatusChangedTemplate, 
    interviewScheduledTemplate, 
    paymentFailedTemplate,
    passwordResetTemplate,
    contactConfirmationTemplate,
    contactNotificationTemplate,
    advertisingConfirmationTemplate,
    advertisingNotificationTemplate,
    welcomeTemplate,
    verificationTemplate,
    jobAlertTemplate,
    sessionReminderTemplate,
    courseEnrollmentTemplate,
    weeklyDigestTemplate,
    subscriptionConfirmationTemplate,
    newApplicationTemplate,
    applicationStatusUpdateTemplate,
};


export {};
