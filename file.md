app.post("/api/forms/:embedToken/submit", async (req, res) => {

    try {

      const { embedToken } = req.params;

      const submission = req.body;

      

      // Find form by embed token

      const form = await storage.getFormByEmbedToken(embedToken);

      if (!form) {

        return res.status(404).json({ message: "Form not found" });

      }

      

      // Extract lead data from submission

      const leadData = {

        businessId: form.businessId,

        name: submission.name || submission.Name || "Unknown",

        email: submission.email || submission.Email || null,

        phone: submission.phone || submission.Phone || null,

        source: "form",

        formId: form.id,

        customFields: submission,

        notes: submission.message || submission.Message || null,

        referralCode: submission.referralCode || null,

        smsOptIn: Boolean(submission.smsOptIn || submission['sms-opt-in'] || false)

      };

      

      // Create lead

      const lead = await storage.createLead(leadData);

      

      // Handle referral tracking if referral code is present

      if (submission.referralCode) {

        try {

          // Find the referrer client by referral code

          const referrer = await storage.getClientByReferralCode(submission.referralCode, form.businessId);

          

          if (referrer) {

            // Create referral record

            await storage.createReferral({

              businessId: form.businessId,

              referrerCode: submission.referralCode,

              refereeName: lead.name,

              refereeEmail: lead.email || "unknown@example.com",

              refereePhone: lead.phone

            });

            

            // Log referral tracking

            await logEvent(form.businessId.toString(), "referral_tracked", {

              form_id: form.id,

              form_name: form.name,

              lead_id: lead.id,

              lead_name: lead.name,

              referrer_code: submission.referralCode,

              referrer_name: referrer.name,

              submission_source: "embedded_form"

            });

          }

        } catch (error) {

          console.error("Error tracking referral:", error);

          // Continue with form submission even if referral tracking fails

        }

      }

      

      // Update form submission count

      await storage.incrementFormSubmissions(form.id);

      

      // Log form submission

      await logEvent(form.businessId.toString(), "form_submitted", {

        form_id: form.id,

        form_name: form.name,

        lead_id: lead.id,

        lead_name: lead.name,

        submission_source: "public_form",

        has_referral: !!submission.referralCode

      });

      

      res.json({ 

        success: true, 

        message: "Thank you for your submission! We'll be in touch soon." 

      });

    } catch (error) {

      console.error("Form submission error:", error);

      res.status(500).json({ message: "Failed to submit form" });

    }

  });



  // Form embed endpoint (returns HTML form)

  app.get("/api/forms/:embedToken/embed", async (req, res) => {

    try {

      const { embedToken } = req.params;

      

      const form = await storage.getFormByEmbedToken(embedToken);

      if (!form) {

        return res.status(404).send("Form not found");

      }

      

      // Generate HTML form based on form fields

      const formFields = Array.isArray(form.fields) ? form.fields : [];

      const formStyles = (form.styles as any) || {

        font: 'Inter',

        primaryColor: '#667eea',

        textColor: '#374151',

        backgroundColor: '#ffffff',

        buttonShape: 'rounded',

        fieldBorderStyle: 'boxed',

        theme: 'modern',

        spacing: 'comfortable',

        borderRadius: '8px',

        shadowLevel: 'subtle',

        gradientStyle: 'none',

        containerWidth: 'full',

        fieldSize: 'medium',

        buttonStyle: 'solid',

        trustElements: true,

        privacyText: 'We respect your privacy and will never spam you.'

      };

      

      const fieldHtml = await Promise.all(formFields.map(async (field: any) => {

        switch (field.type) {

          case "text":

          case "email":

          case "phone":

            return `

              <div class="form-field">

                <label class="form-label">${field.label}${field.required ? '<span class="required-asterisk">*</span>' : ''}</label>

                <input 

                  type="${field.type}" 

                  name="${field.id}" 

                  placeholder="${field.placeholder || ''}"

                  ${field.required ? 'required' : ''}

                  class="form-input"

                />

              </div>

            `;

          case "textarea":

            return `

              <div class="form-field">

                <label class="form-label">${field.label}${field.required ? '<span class="required-asterisk">*</span>' : ''}</label>

                <textarea 

                  name="${field.id}" 

                  placeholder="${field.placeholder || ''}"

                  ${field.required ? 'required' : ''}

                  rows="4"

                  class="form-textarea"

                ></textarea>

              </div>

            `;

          case "select":

            const options = Array.isArray(field.options) ? field.options : [];

            return `

              <div class="form-field">

                <label class="form-label">${field.label}${field.required ? '<span class="required-asterisk">*</span>' : ''}</label>

                <select 

                  name="${field.id}" 

                  ${field.required ? 'required' : ''}

                  class="form-select"

                >

                  <option value="">Choose an option...</option>

                  ${options.map((opt: string) => `<option value="${opt}">${opt}</option>`).join('')}

                </select>

              </div>

            `;

          case "checkbox":

            return `

              <div class="form-field">

                <div class="checkbox-field">

                  <input 

                    type="checkbox" 

                    name="${field.id}" 

                    value="true"

                    ${field.required ? 'required' : ''}

                    class="form-checkbox"

                    id="${field.id}"

                  />

                  <label for="${field.id}" class="checkbox-label">${field.label}${field.required ? '<span class="required-asterisk">*</span>' : ''}</label>

                </div>

              </div>

            `;

          case "sms-optin":

            const business = await storage.getBusinessById(form.businessId);

            const businessName = business?.name || '[Business Name]';

            return `

              <div class="form-field">

                <div class="sms-optin-field">

                  <input 

                    type="checkbox" 

                    name="smsOptIn" 

                    value="true"

                    class="form-checkbox"

                    id="sms-optin-${field.id}"

                  />

                  <label for="sms-optin-${field.id}" class="checkbox-label sms-optin-label">

                    ${field.smsOptInText || field.label || "Yes, I'd like to receive SMS updates about my service appointments and special offers."}

                  </label>

                </div>

                <div class="sms-compliance-notice">

                  <small style="color: #6b7280; font-size: 12px; margin-top: 8px; display: block; line-height: 1.4;">

                    By checking this box, you consent to receive SMS messages from ${businessName} related to booking inquiries and other relevant communications.

                  </small>

                </div>

              </div>

            `;

          default:

            return '';

        }

      }));

      

      const fieldHtmlString = fieldHtml.join('');



      const html = `

        <!DOCTYPE html>

        <html lang="en">

        <head>

          <meta charset="UTF-8">

          <meta name="viewport" content="width=device-width, initial-scale=1.0">

          <title>${form.name}</title>

          <style>

            #referable-form-${embedToken} {

              --rf-font: '${formStyles.font}', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;

              --rf-primary-color: ${formStyles.primaryColor};

              --rf-text-color: ${formStyles.textColor};

              --rf-bg-color: ${formStyles.backgroundColor};

              --rf-button-radius: ${formStyles.buttonShape === 'rounded' ? '8px' : formStyles.buttonShape === 'slightly-rounded' ? '4px' : '0px'};

              --rf-field-border: ${formStyles.fieldBorderStyle === 'boxed' ? '2px solid #e5e7eb' : formStyles.fieldBorderStyle === 'underline' ? '0px solid transparent' : 'none'};

              --rf-field-border-bottom: ${formStyles.fieldBorderStyle === 'underline' ? '2px solid #e5e7eb' : 'inherit'};

              --rf-spacing: ${formStyles.spacing === 'compact' ? '16px' : formStyles.spacing === 'spacious' ? '32px' : '24px'};

              --rf-field-size: ${formStyles.fieldSize === 'small' ? '10px 12px' : formStyles.fieldSize === 'large' ? '16px 20px' : '12px 16px'};

              --rf-shadow: ${formStyles.shadowLevel === 'none' ? 'none' : formStyles.shadowLevel === 'medium' ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : formStyles.shadowLevel === 'strong' ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'};

              --rf-container-width: ${formStyles.containerWidth === 'narrow' ? '320px' : formStyles.containerWidth === 'medium' ? '480px' : formStyles.containerWidth === 'wide' ? '640px' : '100%'};

            }

            

            * {

              box-sizing: border-box;

            }

            body {

              font-family: var(--rf-font);

              line-height: 1.6;

              color: var(--rf-text-color);

              margin: 0;

              padding: 20px;

              background: linear-gradient(135deg, var(--rf-primary-color) 0%, #764ba2 100%);

              min-height: 100vh;

            }

            #referable-form-${embedToken} .form-container {

              background: var(--rf-bg-color);

              max-width: var(--rf-container-width);

              margin: 0 auto;

              padding: var(--rf-spacing);

              border-radius: var(--rf-button-radius);

              box-shadow: var(--rf-shadow);

              position: relative;

              overflow: hidden;

              ${formStyles.theme === 'modern' ? 'border-top: 4px solid var(--rf-primary-color);' : ''}

              ${formStyles.theme === 'minimal' ? 'border: 1px solid #e5e7eb;' : ''}

              ${formStyles.theme === 'classic' ? 'border: 2px solid #d1d5db; background: #fafafa;' : ''}

              ${formStyles.theme === 'vibrant' ? 'background: linear-gradient(135deg, var(--rf-bg-color) 0%, #f3f4f6 100%);' : ''}

            }

            #referable-form-${embedToken} .form-container::before {

              content: '';

              position: absolute;

              top: 0;

              left: 0;

              right: 0;

              height: 4px;

              background: linear-gradient(90deg, var(--rf-primary-color) 0%, #764ba2 100%);

            }

            #referable-form-${embedToken} .form-title {

              font-size: 28px;

              font-weight: 700;

              margin-bottom: 8px;

              color: var(--rf-text-color);

              text-align: center;

            }

            #referable-form-${embedToken} .form-description {

              color: var(--rf-text-color);

              opacity: 0.7;

              margin-bottom: 32px;

              font-size: 16px;

              text-align: center;

              line-height: 1.5;

            }

            #referable-form-${embedToken} .form-field {

              margin-bottom: var(--rf-spacing);

            }

            #referable-form-${embedToken} .form-label {

              display: block;

              font-size: 14px;

              font-weight: 600;

              color: var(--rf-text-color);

              margin-bottom: 8px;

            }

            #referable-form-${embedToken} .required-asterisk {

              color: #ef4444;

              margin-left: 2px;

            }

            #referable-form-${embedToken} .form-input, 

            #referable-form-${embedToken} .form-textarea, 

            #referable-form-${embedToken} .form-select {

              width: 100%;

              padding: var(--rf-field-size);

              border: var(--rf-field-border);

              border-bottom: var(--rf-field-border-bottom);

              border-radius: var(--rf-button-radius);

              font-size: ${formStyles.fieldSize === 'small' ? '14px' : formStyles.fieldSize === 'large' ? '18px' : '16px'};

              color: var(--rf-text-color);

              background-color: #ffffff;

              transition: all 0.2s ease;

              outline: none;

              font-family: var(--rf-font);

            }

            #referable-form-${embedToken} .form-input:focus, 

            #referable-form-${embedToken} .form-textarea:focus, 

            #referable-form-${embedToken} .form-select:focus {

              border-color: var(--rf-primary-color);

              box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);

            }

            .form-input::placeholder, .form-textarea::placeholder {

              color: #9ca3af;

            }

            .form-textarea {

              resize: vertical;

              min-height: 100px;

            }

            .form-select {

              cursor: pointer;

              appearance: none;

              background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");

              background-position: right 12px center;

              background-repeat: no-repeat;

              background-size: 16px;

              padding-right: 48px;

            }

            .checkbox-field {

              display: flex;

              align-items: flex-start;

              gap: 12px;

            }

            .form-checkbox {

              width: 18px;

              height: 18px;

              margin: 0;

              cursor: pointer;

              accent-color: #667eea;

            }

            .checkbox-label {

              font-size: 14px;

              color: #374151;

              cursor: pointer;

              line-height: 1.4;

              margin: 0;

            }

            .sms-optin-field {

              display: flex;

              align-items: flex-start;

              gap: 12px;

              padding: 16px;

              background: #f8fafc;

              border-left: 4px solid var(--rf-primary-color);

              border-radius: var(--rf-button-radius);

              margin-top: 8px;

            }

            .sms-optin-label {

              font-size: 13px;

              color: #475569;

              line-height: 1.5;

              font-weight: 500;

            }

            .privacy-text {

              margin-top: var(--rf-spacing);

              padding: 16px;

              background: #f8fafc;

              border-radius: var(--rf-button-radius);

              border: 1px solid #e2e8f0;

              text-align: center;

            }

            .privacy-icons {

              display: flex;

              justify-content: center;

              gap: 8px;

              margin-bottom: 8px;

            }

            .security-icon, .verified-icon {

              font-size: 16px;

              opacity: 0.8;

            }

            .privacy-message {

              font-size: 12px;

              color: #64748b;

              margin: 0;

              line-height: 1.4;

              font-weight: 500;

            }

            #referable-form-${embedToken} .submit-button {

              ${formStyles.buttonStyle === 'solid' ? `background: var(--rf-primary-color); color: white; border: none;` : ''}

              ${formStyles.buttonStyle === 'outline' ? `background: transparent; color: var(--rf-primary-color); border: 2px solid var(--rf-primary-color);` : ''}

              ${formStyles.buttonStyle === 'gradient' ? `background: linear-gradient(135deg, var(--rf-primary-color) 0%, #764ba2 100%); color: white; border: none;` : ''}

              padding: ${formStyles.fieldSize === 'small' ? '10px 24px' : formStyles.fieldSize === 'large' ? '18px 40px' : '14px 32px'};

              border-radius: var(--rf-button-radius);

              font-size: ${formStyles.fieldSize === 'small' ? '14px' : formStyles.fieldSize === 'large' ? '18px' : '16px'};

              font-weight: 600;

              cursor: pointer;

              width: 100%;

              transition: all 0.2s ease;

              position: relative;

              overflow: hidden;

              font-family: var(--rf-font);

            }

            #referable-form-${embedToken} .submit-button:hover:not(:disabled) {

              transform: translateY(-1px);

              filter: brightness(110%);

              box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);

            }

            #referable-form-${embedToken} .submit-button:active {

              transform: translateY(0);

            }

            #referable-form-${embedToken} .submit-button:disabled {

              opacity: 0.7;

              cursor: not-allowed;

              transform: none;

              box-shadow: none;

            }

            .success-message {

              background: linear-gradient(135deg, #10b981 0%, #059669 100%);

              color: white;

              padding: 16px 20px;

              border-radius: 8px;

              margin-bottom: 24px;

              font-weight: 500;

              text-align: center;

              animation: slideIn 0.3s ease;

              display: none;

            }

            .error-message {

              background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);

              color: white;

              padding: 16px 20px;

              border-radius: 8px;

              margin-bottom: 24px;

              font-weight: 500;

              text-align: center;

              animation: slideIn 0.3s ease;

              display: none;

            }

            @keyframes slideIn {

              from {

                opacity: 0;

                transform: translateY(-10px);

              }

              to {

                opacity: 1;

                transform: translateY(0);

              }

            }

            .loading-spinner {

              display: inline-block;

              width: 16px;

              height: 16px;

              border: 2px solid #ffffff;

              border-radius: 50%;

              border-top-color: transparent;

              animation: spin 1s ease-in-out infinite;

              margin-right: 8px;

            }

            @keyframes spin {

              to { transform: rotate(360deg); }

            }

            @media (max-width: 640px) {

              body {

                padding: 16px;

              }

              .form-container {

                padding: 24px;

              }

              .form-title {

                font-size: 24px;

              }

            }

          </style>

        </head>

        <body>

          <div id="referable-form-${embedToken}">

            <div class="form-container">

              <h1 class="form-title">${form.name}</h1>

              ${form.description ? `<p class="form-description">${form.description}</p>` : ''}

              

              <div class="success-message" id="success-message">

                ✨ Thank you! Your information has been submitted successfully. We'll be in touch soon!

              </div>

              <div class="error-message" id="error-message">

                ⚠️ Sorry, there was an error submitting your information. Please try again or contact us directly.

              </div>

              

              <form id="lead-form">

                ${fieldHtmlString}

                <button type="submit" class="submit-button" id="submit-btn">Submit</button>

                ${formStyles.trustElements ? `

                  <div class="privacy-text">

                    <div class="privacy-icons">

                      <span class="security-icon">🔒</span>

                      <span class="verified-icon">✓</span>

                    </div>

                    <p class="privacy-message">${formStyles.privacyText || 'We respect your privacy and will never spam you.'}</p>

                  </div>

                ` : ''}

              </form>

            </div>

          </div>



          <script>

            // Referral tracking functionality

            function detectReferralCode() {

              // Check for 'ref' parameter in current page URL

              const urlParams = new URLSearchParams(window.location.search);

              let referralCode = urlParams.get('ref');

              

              // If not found in current page, check parent window (for iframe embedding)

              if (!referralCode && window.parent !== window) {

                try {

                  const parentParams = new URLSearchParams(window.parent.location.search);

                  referralCode = parentParams.get('ref');

                } catch (e) {

                  // Cross-origin iframe restrictions - try to get from document.referrer

                  if (document.referrer) {

                    try {

                      const referrerUrl = new URL(document.referrer);

                      const referrerParams = new URLSearchParams(referrerUrl.search);

                      referralCode = referrerParams.get('ref');

                    } catch (e) {

                      console.debug('Could not parse referrer URL for referral code');

                    }

                  }

                }

              }

              

              // Store referral code if found

              if (referralCode) {

                console.debug('Referral code detected:', referralCode);

                sessionStorage.setItem('referralCode', referralCode);

                

                // Show referral indicator (optional visual feedback)

                showReferralIndicator(referralCode);

              }

              

              return referralCode;

            }

            

            function showReferralIndicator(referralCode) {

              const formTitle = document.querySelector('.form-title');

              if (formTitle && !document.querySelector('.referral-indicator')) {

                const indicator = document.createElement('div');

                indicator.className = 'referral-indicator';

                indicator.style.cssText = \`

                  background: linear-gradient(135deg, #10b981 0%, #059669 100%);

                  color: white;

                  padding: 8px 16px;

                  border-radius: 20px;

                  font-size: 12px;

                  font-weight: 600;

                  text-align: center;

                  margin-bottom: 16px;

                  animation: fadeIn 0.5s ease;

                \`;

                indicator.innerHTML = '🎉 Referred by ' + referralCode + ' - You both get rewards!';

                formTitle.parentNode.insertBefore(indicator, formTitle.nextSibling);

              }

            }

            

            // Detect referral on page load

            document.addEventListener('DOMContentLoaded', function() {

              detectReferralCode();

            });

            

            // Form submission with referral tracking

            document.getElementById('lead-form').addEventListener('submit', async (e) => {

              e.preventDefault();

              

              const submitBtn = document.getElementById('submit-btn');

              const successMsg = document.getElementById('success-message');

              const errorMsg = document.getElementById('error-message');

              

              submitBtn.disabled = true;

              submitBtn.innerHTML = '<span class="loading-spinner"></span>Submitting...';

              successMsg.style.display = 'none';

              errorMsg.style.display = 'none';

              

              const formData = new FormData(e.target);

              const data = Object.fromEntries(formData.entries());

              

              // Add referral code if available

              const referralCode = sessionStorage.getItem('referralCode') || detectReferralCode();

              if (referralCode) {

                data.referralCode = referralCode;

                console.debug('Including referral code in submission:', referralCode);

              }

              

              try {

                const response = await fetch('/api/forms/${embedToken}/submit', {

                  method: 'POST',

                  headers: { 'Content-Type': 'application/json' },

                  body: JSON.stringify(data)

                });

                

                if (response.ok) {

                  successMsg.style.display = 'block';

                  e.target.reset();

                  

                  // Update success message for referrals

                  if (referralCode) {

                    successMsg.innerHTML = '🎉 Thank you! Your referral has been tracked and you both qualify for rewards. We\'ll be in touch soon!';

                  }

                  

                  // Scroll to success message

                  successMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });

                } else {

                  throw new Error('Submission failed');

                }

              } catch (error) {

                errorMsg.style.display = 'block';

                

                // Scroll to error message

                errorMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });

              } finally {

                submitBtn.disabled = false;

                submitBtn.innerHTML = 'Submit';

              }

            });

          </script>

        </body>

        </html>

      `;

      

      res.setHeader('Content-Type', 'text/html');

      res.send(html);

    } catch (error) {

      console.error("Form embed error:", error);

      res.status(500).send("Error loading form");

    }

  });







