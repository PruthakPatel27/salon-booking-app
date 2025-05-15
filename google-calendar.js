// Google Calendar API integration using Service Account with personal Gmail account
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
        gapi: null,
        jwtClient: null,
        
        // Initialize Google API with service account
        initializeGoogleAPI: async function() {
            try {
                console.log('Initializing Google API with service account');
                
                // Load the required libraries
                await this.loadGapiClient();
                
                // Load Google Auth library first
                await this.loadGoogleAuthLibrary();
                
                // Initialize JWT client for service account auth
                await this.initializeJwtClient();
                
                // Set the authentication flag
                this.isAuthenticated = true;
                console.log('Service account authentication successful');
                
                // Initialize booking state if available
                if (window.bookingState) {
                    window.bookingState.isAuthenticated = true;
                    
                    // If date is already selected, fetch slots
                    if (window.bookingState.date) {
                        window.googleCalendarIntegration.fetchAvailableSlotsFromGoogleCalendar(window.bookingState.date, window.bookingState);
                    }
                }
            } catch (error) {
                console.error('Error initializing Google API with service account:', error);
            }
        },
        
        // Load the GAPI client
        loadGapiClient: function() {
            return new Promise((resolve, reject) => {
                if (typeof gapi === 'undefined') {
                    console.error('Google API client library not loaded');
                    reject(new Error('Google API client library not loaded'));
                    return;
                }
                
                gapi.load('client', async () => {
                    try {
                        await gapi.client.init({
                            apiKey: 'AIzaSyCIB0VXUzsQjxrz9g8QIzeu8UVf9ohbWgo',
                            discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"]
                        });
                        this.gapi = gapi;
                        console.log('GAPI client loaded successfully');
                        resolve();
                    } catch (error) {
                        console.error('Error initializing GAPI client:', error);
                        reject(error);
                    }
                });
            });
        },
        
        // Load Google Auth Library
        loadGoogleAuthLibrary: function() {
            return new Promise((resolve, reject) => {
                // Check if the library is already loaded
                if (typeof google !== 'undefined' && typeof google.accounts !== 'undefined' && typeof google.accounts.oauth2 !== 'undefined') {
                    console.log('Google Auth library already loaded');
                    resolve();
                    return;
                }
                
                // Create and load the Google Auth library script
                const script = document.createElement('script');
                script.src = 'https://accounts.google.com/gsi/client';
                script.async = true;
                script.defer = true;
                
                script.onload = () => {
                    console.log('Google Auth library loaded');
                    resolve();
                };
                
                script.onerror = () => {
                    console.error('Failed to load Google Auth library');
                    reject(new Error('Failed to load Google Auth library'));
                };
                
                document.body.appendChild(script);
            });
        },
        
        // Initialize JWT client for service account
        initializeJwtClient: async function() {
            try {
                console.log('Initializing JWT client...');
                
                // Check if google.auth is available
                if (typeof google === 'undefined') {
                    throw new Error('Google library not loaded');
                }
                
                if (typeof google.auth === 'undefined') {
                    throw new Error('Google Auth library not loaded');
                }
                
                if (typeof google.auth.JWT === 'undefined') {
                    throw new Error('Google Auth JWT class not loaded');
                }
                
                // Import the required gapi auth libraries
                await new Promise((resolve) => gapi.load('client:auth2', resolve));
                
                // Set up JWT client
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
                
                // Set the auth client
                gapi.client.setToken({
                    access_token: tokens.access_token
                });
                
                this.jwtClient = authClient;
                console.log('JWT client initialized successfully with token:', tokens.access_token.substring(0, 10) + '...');
            } catch (error) {
                console.error('Error initializing JWT client:', error);
                throw error;
            }
        },
        
        // Refresh token if expired
        refreshAuthToken: async function() {
            if (!this.jwtClient) {
                console.log('No JWT client, initializing...');
                await this.initializeJwtClient();
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
                
                console.log('Token refreshed successfully:', tokens.access_token.substring(0, 10) + '...');
            } catch (error) {
                console.error('Error refreshing auth token:', error);
                throw error;
            }
        },
        
        // Fetch available slots from Google Calendar
        fetchAvailableSlotsFromGoogleCalendar: async function(date, bookingState) {
            try {
                console.log('Fetching available slots for date:', date);
                
                // Make sure we're authenticated
                if (!this.isAuthenticated) {
                    console.log('Not authenticated, initializing Google API...');
                    await this.initializeGoogleAPI();
                }
                
                // Refresh token if needed
                await this.refreshAuthToken();
                
                // Get the start and end of the day in ISO format
                const timeMin = new Date(`${date}T00:00:00`).toISOString();
                const timeMax = new Date(`${date}T23:59:59`).toISOString();
                
                console.log(`Fetching events between ${timeMin} and ${timeMax}`);
                
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
                
                console.log(`Found ${events ? events.length : 0} events for date ${date}`);
                
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
                            console.log(`Found booked slot: ${timeStr}`);
                        }
                    }
                }
                
                // Update state with booked slots from Google Calendar
                if (bookingState) {
                    bookingState.bookedSlots[date] = bookedSlotsForDate;
                    console.log(`Updated booking state with ${bookedSlotsForDate.length} booked slots for ${date}`);
                    
                    // If we're on the time selection step, regenerate the time slots
                    if (bookingState.currentStep === 4) {
                        // Call the generateTimeSlots function if it exists
                        if (typeof window.generateTimeSlots === 'function') {
                            window.generateTimeSlots(date);
                            console.log('Regenerated time slots for current view');
                        }
                    }
                }
                
                return bookedSlotsForDate;
                
            } catch (error) {
                console.error('Error fetching events from Google Calendar:', error);
                return [];
            }
        },
        
        // Add an event to Google Calendar
        addEventToGoogleCalendar: async function(bookingData) {
            try {
                console.log('Adding event to Google Calendar for booking:', bookingData.appointmentId);
                
                // Make sure we're authenticated
                if (!this.isAuthenticated) {
                    console.log('Not authenticated, initializing Google API...');
                    await this.initializeGoogleAPI();
                }
                
                // Refresh token if needed
                await this.refreshAuthToken();
                
                const startDateTime = new Date(`${bookingData.date}T${bookingData.time}`);
                const endDateTime = new Date(startDateTime.getTime() + bookingData.totalDuration * 60000);
                
                console.log(`Event start time: ${startDateTime.toISOString()}, end time: ${endDateTime.toISOString()}`);
                
                // Format add-ons for description if any
                let addonsText = '';
                if (bookingData.addons && bookingData.addons.length > 0) {
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
                
                console.log(`Updating event ${eventId} for booking ${bookingData.appointmentId}`);
                
                // Refresh token if needed
                await this.refreshAuthToken();
                
                const startDateTime = new Date(`${bookingData.date}T${bookingData.time}`);
                const endDateTime = new Date(startDateTime.getTime() + bookingData.totalDuration * 60000);
                
                // Format add-ons for description if any
                let addonsText = '';
                if (bookingData.addons && bookingData.addons.length > 0) {
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
                
                console.log(`Deleting event ${eventId} from Google Calendar`);
                
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
        console.log('DOM content loaded, initializing Google Calendar integration');
        
        // Check if Google API is loaded
        if (typeof gapi !== 'undefined') {
            console.log('GAPI is defined, initializing integration');
            // We need to delay the initialization slightly to ensure libraries are loaded
            setTimeout(() => {
                window.googleCalendarIntegration.initializeGoogleAPI();
            }, 1000);
        } else {
            console.warn('Google API libraries not loaded. Calendar integration will be disabled.');
            
            // Try to load the libraries
            const gapiScript = document.createElement('script');
            gapiScript.src = 'https://apis.google.com/js/api.js';
            gapiScript.async = true;
            gapiScript.defer = true;
            
            gapiScript.onload = () => {
                console.log('GAPI loaded dynamically');
                
                const gsiScript = document.createElement('script');
                gsiScript.src = 'https://accounts.google.com/gsi/client';
                gsiScript.async = true;
                gsiScript.defer = true;
                
                gsiScript.onload = () => {
                    console.log('GSI loaded dynamically');
                    // Add a delay to ensure libraries are fully loaded
                    setTimeout(() => {
                        window.googleCalendarIntegration.initializeGoogleAPI();
                    }, 1000);
                };
                
                document.body.appendChild(gsiScript);
            };
            
            document.body.appendChild(gapiScript);
        }
    });
})();
