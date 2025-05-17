})();// Google Calendar API integration using Service Account with personal Gmail account
(function() {
    // Path configuration for GitHub Pages
    const APP_PATH = ''; // Empty string for GitHub Pages
    const BASE_URL = 'https://pruthakpatel27.github.io/salon-booking-app';
    
    // Google Calendar API configuration - USE YOUR PERSONAL GMAIL CALENDAR ID HERE
    const CALENDAR_ID = '1b0facc4b0d9a943d9c1ec34d2a4b0722625eaec57b3ac4a28467ae1ed8282a8@group.calendar.google.com'; // Replace with your personal Gmail calendar ID if not using 'primary'
    
    // Service account configuration from your personal Gmail account project
    const SERVICE_ACCOUNT = {
        client_email: "salon-calendar-service@northern-math-459404-c0.iam.gserviceaccount.com",
        private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDBKhM+g3bWilfz\nDmQCgEU9Rx4qtOm2ZzNcEKrIn/Vv2PSGakUjOQ4kHqxezIBCRAWic9GZTeliSe7E\ncynEMo8x/+Btj+nIco9rU0AYFvxd/tiacLKFuYW6wXAHFoI49Sjzg//XV2pt6n2F\nflORbI6mAkojDMcIFCZIXe/o7oh8kbVierfnp2E/yQKnhyNoToPEZzXv+3JLX1ni\n2atuKmFqg2T5Cpwj3irFJna2j75z7ob3pfxJ78vzPJszmH/pRohkZND00o0SLGDs\nfXdAKbN+4ZF4ZpqmRi28r8KIjSmrR8J52fM6szSMmWoFxAHljNWZNULdAV9FO1U5\njYi05PqXAgMBAAECggEADN0s9+pQZTxEXCr2rRX2xnxwfV6b++pGiNiRTxgcA81a\nh4MXRJ+9mdkzGIMc/YzDJUz6Re/i3YlX7dxPiUHmuGk2fIVrh85dT8P1DkWlm+rn\naO2dbftrdQMB32730Cw/hGwjgydOrrBBmLzPeu1UWKjpYAkvThHtdL9QxV3xV/5M\nfvoGDTtIv6BMLuy+GSCoqrCOR2kN5+n/1oDrV0maahRb1T+DiKJ8AnpWdrIs6XXP\novoSY2V2M2ueDBtBxFwSJyLvLzKq099RzcacpaZA8xq/FQTFgvX1i1wzrdaFgcJT\nQgB3M6bYYqyO540WbJ9YXUK+P4V84N7efvOlsECnSQKBgQDr4ws/8o8RKJDHBAWp\npIbY8GFRC/ej5CVfRdT2CfN+b39EEktRV1lFo6tqdOq108f+lxZYUFEHvOkxc8d2\nimrzh7+4M51aVzxFRgYgR+grN5SXPuM8TmYgzEQxuqFf/+BtKO+af2BTeddwYHSr\n3p1sVSdKtfPRgQxOxTz2WutzTwKBgQDRonsNIa60oXeIbzgYyUdIj4A4l+tyJANq\nO9dZFenF0XjqdpQTgf8ur7pmFayujYOzWr305D/MV8UWprlCZ97skYCustiUkIWM\n/t1B5bKOCPfbplswI4b7h3jKQTIf0T76Q6VxvcFTEXh5zPYQgi7Y8Fj1leWsmQ7F\n07VzPadSOQKBgAfXxbD7nJwicCXd0V5hlQYzf9jVAAfX9xIi3UDM9eaXSHD39r8e\nm15AYdupRYCEKRsi5OBM01ThiBNX2SLs2T99nPc/6BRv4BYhjOSX33VIZM1ejumb\nZbPjdsT8go8Rj+GxQb4uTAKag3o+CsMIJM3MSwEl6ZRmqQUZc7xxK3DrAoGBAI8Z\n7AfFw124j0FKMq/wzkFA/BUl12o+HTqqiNFePQt1d6YNtf0vE0QKXyKKjytEnO+U\n9PCz0r0p+PcCbppfD3TLylz25xNbKF9cJytxohaFFrUQ9VSCHAWdr53ZLV881lG+\nVbS0BMEwvt3eROZ2B4a9YuyaG4NbpBL09vsozgw5AoGBANcPO7+/fLv6foUdrHOj\n7pR9l07u3MNMsEkbZqQuNBOMEQgk42daBd7H6QXFSSRhTyXtuK0CxLfLQFR6qUjh\nMcalScfSeseOUBqbrmazylB89cJ5npryltC5snPlkyuPThGtorITIP8Pc/Tt3xvc\n4BXk87NJLAnNs6CAQKHks3mE\n-----END PRIVATE KEY-----\n", // Replace with the private key from your JSON file
        project_id: "northern-math-459404-c0"
    };
    
    // Create global googleCalendarIntegration object
    window.googleCalendarIntegration = {
        isAuthenticated: false,
        authInProgress: false,
        
        // Initialize Google API with service account
        initializeGoogleAPI: async function() {
            try {
                console.log('Initializing Google API with service account');
                if (this.authInProgress) {
                    console.log('Authentication already in progress, waiting...');
                    return;
                }
                
                this.authInProgress = true;
                
                // Load required scripts if they don't exist
                await this.loadRequiredScripts();
                
                // Create JWT client for service account
                const authClient = await this.createJwtClient();
                
                // Set the authentication flag
                this.isAuthenticated = true;
                this.authInProgress = false;
                console.log('Service account authentication successful');
                
                // Initialize booking state if available
                if (window.bookingState) {
                    window.bookingState.isAuthenticated = true;
                    
                    // If date is already selected, fetch slots
                    if (window.bookingState.date) {
                        this.fetchAvailableSlotsFromGoogleCalendar(window.bookingState.date, window.bookingState);
                    }
                }
                
                return authClient;
            } catch (error) {
                this.authInProgress = false;
                console.error('Error initializing Google API with service account:', error);
                // Continue with app functionality even if calendar fails
                return null;
            }
        },
        
        // Load required scripts (gapi and googleapis)
        loadRequiredScripts: async function() {
            // First ensure gapi is loaded
            if (typeof gapi === 'undefined') {
                await this.loadScript('https://apis.google.com/js/api.js');
                // Wait for it to be properly initialized
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            // Make sure the gapi client is loaded
            if (!gapi.client) {
                await new Promise((resolve) => {
                    gapi.load('client', resolve);
                });
                // Wait for client to be ready
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            // Initialize gapi client
            await gapi.client.init({
                apiKey: 'AIzaSyCIB0VXUzsQjxrz9g8QIzeu8UVf9ohbWgo',
                discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"]
            });
            
            // Now load the Google Identity Services library for JWT auth
            if (typeof google === 'undefined' || !google.auth) {
                await this.loadScript('https://accounts.google.com/gsi/client');
                // Give more time for this script to properly initialize
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            // Additional check to make sure google.auth is available
            if (typeof google === 'undefined' || !google.auth) {
                // If still not available, try loading a polyfill
                await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/google-api-javascript-client/1.1.0/googleapis.min.js');
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        },
        
        // Helper function to load a script
        loadScript: function(src) {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = resolve;
                script.onerror = reject;
                document.body.appendChild(script);
            });
        },
        
        // Create JWT client for service account
        createJwtClient: async function() {
            try {
                // Check if Google auth library is available
                if (typeof google === 'undefined' || !google.auth) {
                    console.error('Google auth library not fully loaded, trying alternative approach');
                    
                    // Alternative implementation using REST API directly if JWT auth is not available
                    return await this.createTokenWithREST();
                }
                
                // Check specifically for JWT
                if (!google.auth.JWT) {
                    console.error('Google JWT auth class not available, trying alternative approach');
                    return await this.createTokenWithREST();
                }
                
                // Create JWT client
                const authClient = new google.auth.JWT(
                    SERVICE_ACCOUNT.client_email,
                    null,
                    SERVICE_ACCOUNT.private_key,
                    ['https://www.googleapis.com/auth/calendar'],
                    null
                );
                
                // Authenticate
                const tokens = await new Promise((resolve, reject) => {
                    authClient.authorize((err, tokens) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve(tokens);
                    });
                });
                
                // Set the auth token for gapi
                gapi.client.setToken({
                    access_token: tokens.access_token
                });
                
                this.jwtClient = authClient;
                return authClient;
            } catch (error) {
                console.error('Error creating JWT client:', error);
                
                // Try alternative approach if the standard approach fails
                try {
                    return await this.createTokenWithREST();
                } catch (alternativeError) {
                    console.error('Alternative authentication also failed:', alternativeError);
                    throw error; // Throw the original error
                }
            }
        },
        
        // Alternative implementation to get access token using a direct REST API call
        createTokenWithREST: async function() {
            try {
                console.log('Attempting alternative REST authentication method');
                
                // Create a JWT manually for direct API call
                const jwt = this.createManualJWT();
                
                // Make a request to Google's token endpoint
                const response = await fetch('https://oauth2.googleapis.com/token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                        assertion: jwt
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`Token request failed with status ${response.status}`);
                }
                
                const tokenData = await response.json();
                
                // Set the received token for gapi
                gapi.client.setToken({
                    access_token: tokenData.access_token
                });
                
                // Create a simple object to mimic the JWT client for consistency
                this.jwtClient = {
                    credentials: {
                        access_token: tokenData.access_token,
                        expiry_date: Date.now() + (tokenData.expires_in * 1000)
                    },
                    authorize: (callback) => {
                        callback(null, {
                            access_token: tokenData.access_token,
                            expiry_date: Date.now() + (tokenData.expires_in * 1000)
                        });
                    }
                };
                
                return this.jwtClient;
            } catch (error) {
                console.error('REST authentication failed:', error);
                throw error;
            }
        },
        
        // Create a JWT manually using the service account information
        createManualJWT: function() {
            // This is a simplified implementation and would need a proper JWT library in production
            
            // For this case, we'll rely on the gapi client to handle auth
            // and just return a placeholder that will indicate an error
            // if this path is actually executed
            
            console.error('Manual JWT creation not implemented - this is a fallback that should not be needed');
            throw new Error('Manual JWT creation not implemented');
        },
        
        // Refresh token if expired
        refreshAuthToken: async function() {
            if (!this.jwtClient) {
                await this.initializeGoogleAPI();
                return;
            }
            
            try {
                const tokens = await new Promise((resolve, reject) => {
                    this.jwtClient.authorize((err, tokens) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        
                        // Update the client token
                        gapi.client.setToken({
                            access_token: tokens.access_token
                        });
                        
                        resolve(tokens);
                    });
                });
                
                return tokens;
            } catch (error) {
                console.error('Error refreshing auth token:', error);
                throw error;
            }
        },
        
        // Fetch available slots from Google Calendar
        fetchAvailableSlotsFromGoogleCalendar: async function(date, bookingState) {
            try {
                // Make sure we're authenticated
                if (!this.isAuthenticated) {
                    await this.initializeGoogleAPI();
                }
                
                // Check if auth was successful
                if (!this.isAuthenticated) {
                    console.log('Unable to authenticate with Google Calendar. Using local booking data only.');
                    return bookingState.bookedSlots[date] || [];
                }
                
                // Refresh token if needed
                await this.refreshAuthToken();
                
                // Get the start and end of the day in ISO format
                const timeMin = new Date(`${date}T00:00:00`).toISOString();
                const timeMax = new Date(`${date}T23:59:59`).toISOString();
                
                const response = await gapi.client.calendar.events.list({
                    'calendarId': CALENDAR_ID,
                    'timeMin': timeMin,
                    'timeMax': timeMax,
                    'showDeleted': false,
                    'singleEvents': true,
                    'orderBy': 'startTime'
                });
                
                // Process events to determine booked slots
                const events = response.result.items;
                const bookedSlotsForDate = [];
                
                if (events && events.length > 0) {
                    for (let i = 0; i < events.length; i++) {
                        const event = events[i];
                        // Only count events with "Salon Appointment" in the title or description
                        if (event.summary && (
                            event.summary.includes("Salon Appointment") || 
                            event.summary.includes("GoBarBerly") ||
                            (event.description && event.description.includes("GoBarBerly Salon"))
                        )) {
                            const start = new Date(event.start.dateTime || event.start.date);
                            const hour = start.getHours();
                            const minute = start.getMinutes();
                            const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                            
                            bookedSlotsForDate.push(timeStr);
                        }
                    }
                }
                
                // Update state with booked slots from Google Calendar
                if (bookingState) {
                    bookingState.bookedSlots[date] = bookedSlotsForDate;
                    
                    // If we're on the time selection step, regenerate the time slots
                    if (bookingState.currentStep === 4) {
                        // Call the generateTimeSlots function if it exists
                        if (typeof generateTimeSlots === 'function') {
                            generateTimeSlots(date);
                        }
                    }
                }
                
                return bookedSlotsForDate;
                
            } catch (error) {
                console.error('Error fetching events from Google Calendar:', error);
                
                // Return existing booked slots as fallback
                return bookingState.bookedSlots[date] || [];
            }
        },
        
        // Add an event to Google Calendar
        addEventToGoogleCalendar: async function(bookingData) {
            try {
                // Make sure we're authenticated
                if (!this.isAuthenticated) {
                    await this.initializeGoogleAPI();
                }
                
                // If still not authenticated, gracefully return
                if (!this.isAuthenticated) {
                    console.log('Unable to authenticate with Google Calendar. Event not added.');
                    return null;
                }
                
                // Refresh token if needed
                await this.refreshAuthToken();
                
                const startDateTime = new Date(`${bookingData.date}T${bookingData.time}`);
                const endDateTime = new Date(startDateTime.getTime() + bookingData.totalDuration * 60000);
                
                // Format add-ons for description if any
                let addonsText = '';
                if (bookingData.addons.length > 0) {
                    addonsText = 'Add-ons: ' + bookingData.addons.map(addon => addon.name).join(', ') + '\n';
                }
                
                // Create event resource - Add prefix to make it easier to identify in personal calendar
                const event = {
                    'summary': `GoBarBerly Salon: ${bookingData.customerInfo.firstName} ${bookingData.customerInfo.lastName} - ${bookingData.service.name}`,
                    'location': 'GoBarBerly Salon',
                    'description': `Salon Appointment\nService: ${bookingData.service.name}\nBarber: ${bookingData.barber.name}\n${addonsText}Customer Email: ${bookingData.customerInfo.email}\nCustomer Phone: ${bookingData.customerInfo.phone}\nAppointment ID: ${bookingData.appointmentId}`,
                    'start': {
                        'dateTime': startDateTime.toISOString(),
                        'timeZone': 'Asia/Kolkata'
                    },
                    'end': {
                        'dateTime': endDateTime.toISOString(),
                        'timeZone': 'Asia/Kolkata'
                    },
                    'reminders': {
                        'useDefault': false,
                        'overrides': [
                            {'method': 'email', 'minutes': 24 * 60},
                            {'method': 'popup', 'minutes': 60}
                        ]
                    },
                    // Add custom color ID for salon appointments to make them visually distinct
                    'colorId': '6' // 6 is Tangerine (orange color)
                };
                
                // Add event to calendar
                const response = await gapi.client.calendar.events.insert({
                    'calendarId': CALENDAR_ID,
                    'resource': event
                });
                
                console.log('Event created: ' + response.result.htmlLink);
                return response.result.id; // Return the event ID for future reference
                
            } catch (error) {
                console.error('Error adding event to Google Calendar:', error);
                return null;
            }
        },
        
        // Update an event in Google Calendar
        updateEventInGoogleCalendar: async function(eventId, bookingData) {
            try {
                // Make sure we're authenticated
                if (!this.isAuthenticated || !eventId) {
                    console.log('Not authenticated or no event ID provided. Skipping calendar update.');
                    return false;
                }
                
                // Refresh token if needed
                await this.refreshAuthToken();
                
                const startDateTime = new Date(`${bookingData.date}T${bookingData.time}`);
                const endDateTime = new Date(startDateTime.getTime() + bookingData.totalDuration * 60000);
                
                // Format add-ons for description if any
                let addonsText = '';
                if (bookingData.addons.length > 0) {
                    addonsText = 'Add-ons: ' + bookingData.addons.map(addon => addon.name).join(', ') + '\n';
                }
                
                // Create updated event resource
                const event = {
                    'summary': `GoBarBerly Salon: ${bookingData.customerInfo.firstName} ${bookingData.customerInfo.lastName} - ${bookingData.service.name}`,
                    'location': 'GoBarBerly Salon',
                    'description': `Salon Appointment\nService: ${bookingData.service.name}\nBarber: ${bookingData.barber.name}\n${addonsText}Customer Email: ${bookingData.customerInfo.email}\nCustomer Phone: ${bookingData.customerInfo.phone}\nAppointment ID: ${bookingData.appointmentId}`,
                    'start': {
                        'dateTime': startDateTime.toISOString(),
                        'timeZone': 'Asia/Kolkata'
                    },
                    'end': {
                        'dateTime': endDateTime.toISOString(),
                        'timeZone': 'Asia/Kolkata'
                    },
                    'colorId': '6' // 6 is Tangerine (orange color)
                };
                
                // Update event in calendar
                const response = await gapi.client.calendar.events.update({
                    'calendarId': CALENDAR_ID,
                    'eventId': eventId,
                    'resource': event
                });
                
                console.log('Event updated: ' + response.result.htmlLink);
                return true;
                
            } catch (error) {
                console.error('Error updating event in Google Calendar:', error);
                return false;
            }
        },
        
        // Delete an event from Google Calendar
        deleteEventFromGoogleCalendar: async function(eventId) {
            try {
                // Make sure we're authenticated
                if (!this.isAuthenticated || !eventId) {
                    console.log('Not authenticated or no event ID provided. Skipping calendar deletion.');
                    return false;
                }
                
                // Refresh token if needed
                await this.refreshAuthToken();
                
                await gapi.client.calendar.events.delete({
                    'calendarId': CALENDAR_ID,
                    'eventId': eventId
                });
                
                console.log('Event deleted successfully');
                return true;
                
            } catch (error) {
                console.error('Error deleting event from Google Calendar:', error);
                return false;
            }
        }
    };
    
    // Initialize when document is ready
    document.addEventListener('DOMContentLoaded', function() {
        // Start authentication immediately without waiting for user action
        window.googleCalendarIntegration.initializeGoogleAPI().catch(error => {
            console.error('Failed to initialize Google Calendar integration:', error);
            // Continue with app functionality even if calendar auth fails
        });
    });
    
    // Also try to initialize if the document is already loaded
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(() => {
            window.googleCalendarIntegration.initializeGoogleAPI().catch(error => {
                console.error('Failed to initialize Google Calendar integration on already loaded page:', error);
            });
        }, 1000);
    }
    
    // Add script tags directly to ensure they load
    function addGoogleScripts() {
        // Add GAPI script if not already present
        if (!document.querySelector('script[src*="apis.google.com/js/api.js"]')) {
            const gapiScript = document.createElement('script');
            gapiScript.src = 'https://apis.google.com/js/api.js';
            gapiScript.async = true;
            gapiScript.defer = true;
            document.head.appendChild(gapiScript);
        }
        
        // Add GSI script if not already present
        if (!document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
            const gsiScript = document.createElement('script');
            gsiScript.src = 'https://accounts.google.com/gsi/client';
            gsiScript.async = true;
            gsiScript.defer = true;
            document.head.appendChild(gsiScript);
        }
    }
    
    // Add scripts immediately
    addGoogleScripts();
