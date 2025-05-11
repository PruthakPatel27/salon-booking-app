// Google Calendar API integration file for GitHub Pages
(function() {
    // Path configuration for GitHub Pages
    const APP_PATH = ''; // Empty string for GitHub Pages
    const BASE_URL = 'https://pruthakpatel27.github.io/salon-booking-app';
    
    // Google Calendar API configuration
    const GOOGLE_API_KEY = 'AIzaSyBf0yU_MxKg5_xAi5F_50NWIFXani8SNVY'; // Replace with your Google API Key
    const GOOGLE_CLIENT_ID = '272475247263-hfe3q59bj3o3hsqaa26epvljh3oq18jh.apps.googleusercontent.com'; // Replace with your Google Client ID
    const GOOGLE_CALENDAR_ID = 'c_574cc7eeed3acc2456f2537d389d5631441626db9edef74346e03ff0869f4130@group.calendar.google.com'; // Replace with your Calendar ID
    const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];
    const SCOPES = "https://www.googleapis.com/auth/calendar";
    
    let tokenClient;
    let gapiInited = false;
    let gisInited = false;
    
    // Create global googleCalendarIntegration object
    window.googleCalendarIntegration = {
        isAuthenticated: false,
        
        // Initialize Google API
        initializeGoogleAPI: function() {
            console.log('Initializing Google API with redirect URI:', BASE_URL + '/oauth2callback');
            gapi.load('client', initGapiClient);
            
            // Function to init tokenClient
            function initTokenClient() {
                tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: GOOGLE_CLIENT_ID,
                    scope: SCOPES,
                    callback: '', // defined at request time
                    // Important: Use the correct redirect URI for GitHub Pages
                    redirect_uri: BASE_URL + '/oauth2callback'
                });
                gisInited = true;
                maybeEnableButtons();
            }
            
            // Init gapi.client
            async function initGapiClient() {
                await gapi.client.init({
                    apiKey: GOOGLE_API_KEY,
                    discoveryDocs: DISCOVERY_DOCS,
                });
                gapiInited = true;
                maybeEnableButtons();
            }
            
            // Initialize Google Identity Services
            initTokenClient();
        },
        
        // Handle sign-in and enable buttons
        handleAuthClick: function() {
            console.log('Handling auth click with redirect URI:', BASE_URL + '/oauth2callback');
            tokenClient.callback = async (resp) => {
                if (resp.error !== undefined) {
                    console.error('Auth error:', resp);
                    throw (resp);
                }
                window.googleCalendarIntegration.isAuthenticated = true;
                if (window.bookingState) {
                    window.bookingState.isAuthenticated = true;
                }
                console.log('Authentication successful');
                
                // If date is already selected, fetch slots
                if (window.bookingState && window.bookingState.date) {
                    window.googleCalendarIntegration.fetchAvailableSlotsFromGoogleCalendar(window.bookingState.date, window.bookingState);
                }
            };

            if (gapi.client.getToken() === null) {
                // Prompt the user for consent
                tokenClient.requestAccessToken({prompt: 'consent'});
            } else {
                // Skip the consent prompt
                tokenClient.requestAccessToken({prompt: ''});
            }
        },
        
        // Fetch available slots from Google Calendar
        fetchAvailableSlotsFromGoogleCalendar: async function(date, bookingState) {
            if (!window.googleCalendarIntegration.isAuthenticated) {
                console.log('Not authenticated with Google. Using mock data.');
                return [];
            }
            
            try {
                // Get the start and end of the day in ISO format
                const timeMin = new Date(`${date}T00:00:00`).toISOString();
                const timeMax = new Date(`${date}T23:59:59`).toISOString();
                
                const response = await gapi.client.calendar.events.list({
                    'calendarId': GOOGLE_CALENDAR_ID,
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
                        const start = new Date(event.start.dateTime || event.start.date);
                        const hour = start.getHours();
                        const minute = start.getMinutes();
                        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                        
                        bookedSlotsForDate.push(timeStr);
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
                return [];
            }
        },
        
        // Add an event to Google Calendar
        addEventToGoogleCalendar: async function(bookingData) {
            if (!window.googleCalendarIntegration.isAuthenticated) {
                console.log('Not authenticated with Google. Attempting authentication...');
                // Try to authenticate silently first
                tokenClient.callback = async (resp) => {
                    if (resp.error !== undefined) {
                        console.error('Auth error:', resp);
                        return null;
                    }
                    window.googleCalendarIntegration.isAuthenticated = true;
                    if (window.bookingState) {
                        window.bookingState.isAuthenticated = true;
                    }
                    console.log('Authentication successful, now adding event');
                    return await window.googleCalendarIntegration.addEventToGoogleCalendar(bookingData);
                };
                
                tokenClient.requestAccessToken({prompt: 'consent'});
                return null;
            }
            
            try {
                const startDateTime = new Date(`${bookingData.date}T${bookingData.time}`);
                const endDateTime = new Date(startDateTime.getTime() + bookingData.totalDuration * 60000);
                
                // Format add-ons for description if any
                let addonsText = '';
                if (bookingData.addons.length > 0) {
                    addonsText = 'Add-ons: ' + bookingData.addons.map(addon => addon.name).join(', ') + '\n';
                }
                
                // Create event resource
                const event = {
                    'summary': `${bookingData.customerInfo.firstName} ${bookingData.customerInfo.lastName} - ${bookingData.service.name}`,
                    'location': 'GoBarBerly Salon',
                    'description': `Service: ${bookingData.service.name}\nBarber: ${bookingData.barber.name}\n${addonsText}Customer Email: ${bookingData.customerInfo.email}\nCustomer Phone: ${bookingData.customerInfo.phone}\nAppointment ID: ${bookingData.appointmentId}`,
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
                    }
                };
                
                // Add event to calendar
                const request = gapi.client.calendar.events.insert({
                    'calendarId': GOOGLE_CALENDAR_ID,
                    'resource': event
                });
                
                const response = await new Promise((resolve, reject) => {
                    request.execute(resp => {
                        if (resp.error) {
                            reject(resp.error);
                        } else {
                            resolve(resp);
                        }
                    });
                });
                
                console.log('Event created: ' + response.htmlLink);
                return response.id; // Return the event ID for future reference
                
            } catch (error) {
                console.error('Error adding event to Google Calendar:', error);
                return null;
            }
        },
        
        // Update an event in Google Calendar
        updateEventInGoogleCalendar: async function(eventId, bookingData) {
            if (!window.googleCalendarIntegration.isAuthenticated || !eventId) {
                console.log('Not authenticated or no event ID provided. Skipping calendar update.');
                return false;
            }
            
            try {
                const startDateTime = new Date(`${bookingData.date}T${bookingData.time}`);
                const endDateTime = new Date(startDateTime.getTime() + bookingData.totalDuration * 60000);
                
                // Format add-ons for description if any
                let addonsText = '';
                if (bookingData.addons.length > 0) {
                    addonsText = 'Add-ons: ' + bookingData.addons.map(addon => addon.name).join(', ') + '\n';
                }
                
                // Create updated event resource
                const event = {
                    'summary': `${bookingData.customerInfo.firstName} ${bookingData.customerInfo.lastName} - ${bookingData.service.name}`,
                    'location': 'GoBarBerly Salon',
                    'description': `Service: ${bookingData.service.name}\nBarber: ${bookingData.barber.name}\n${addonsText}Customer Email: ${bookingData.customerInfo.email}\nCustomer Phone: ${bookingData.customerInfo.phone}\nAppointment ID: ${bookingData.appointmentId}`,
                    'start': {
                        'dateTime': startDateTime.toISOString(),
                        'timeZone': 'Asia/Kolkata'
                    },
                    'end': {
                        'dateTime': endDateTime.toISOString(),
                        'timeZone': 'Asia/Kolkata'
                    }
                };
                
                // Update event in calendar
                const request = gapi.client.calendar.events.update({
                    'calendarId': GOOGLE_CALENDAR_ID,
                    'eventId': eventId,
                    'resource': event
                });
                
                const response = await new Promise((resolve, reject) => {
                    request.execute(resp => {
                        if (resp.error) {
                            reject(resp.error);
                        } else {
                            resolve(resp);
                        }
                    });
                });
                
                console.log('Event updated: ' + response.htmlLink);
                return true;
                
            } catch (error) {
                console.error('Error updating event in Google Calendar:', error);
                return false;
            }
        },
        
        // Delete an event from Google Calendar
        deleteEventFromGoogleCalendar: async function(eventId) {
            if (!window.googleCalendarIntegration.isAuthenticated || !eventId) {
                console.log('Not authenticated or no event ID provided. Skipping calendar deletion.');
                return false;
            }
            
            try {
                const request = gapi.client.calendar.events.delete({
                    'calendarId': GOOGLE_CALENDAR_ID,
                    'eventId': eventId
                });
                
                await new Promise((resolve, reject) => {
                    request.execute(resp => {
                        if (resp.error) {
                            reject(resp.error);
                        } else {
                            resolve(resp);
                        }
                    });
                });
                
                console.log('Event deleted successfully');
                return true;
                
            } catch (error) {
                console.error('Error deleting event from Google Calendar:', error);
                return false;
            }
        }
    };
    
    // Helper function to enable buttons once API is initialized
    function maybeEnableButtons() {
        if (gapiInited && gisInited) {
            console.log('Google APIs initialized successfully');
            // Try automatic silent authentication
            if (gapi.client.getToken() === null) {
                // Will need to authenticate manually later
                console.log('No token available. Will authenticate when needed.');
            } else {
                // Already have a token
                window.googleCalendarIntegration.isAuthenticated = true;
                console.log('Already authenticated with Google Calendar');
                // If date is already selected, fetch slots
                if (window.bookingState && window.bookingState.date) {
                    window.googleCalendarIntegration.fetchAvailableSlotsFromGoogleCalendar(window.bookingState.date, window.bookingState);
                }
            }
        }
    }
    
    // Initialize when document is ready
    document.addEventListener('DOMContentLoaded', function() {
        // Check if Google API is loaded
        if (typeof gapi !== 'undefined' && typeof google !== 'undefined') {
            window.googleCalendarIntegration.initializeGoogleAPI();
        } else {
            console.warn('Google API libraries not loaded. Calendar integration will be disabled.');
            
            // Try to load the libraries
            const gapiScript = document.createElement('script');
            gapiScript.src = 'https://apis.google.com/js/api.js';
            gapiScript.onload = () => {
                console.log('GAPI loaded dynamically');
                
                const gsiScript = document.createElement('script');
                gsiScript.src = 'https://accounts.google.com/gsi/client';
                gsiScript.onload = () => {
                    console.log('GSI loaded dynamically');
                    window.googleCalendarIntegration.initializeGoogleAPI();
                };
                document.body.appendChild(gsiScript);
            };
            document.body.appendChild(gapiScript);
        }
    });
})();
