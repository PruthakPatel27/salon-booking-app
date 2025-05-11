/**
 * calendar-integration.js
 * 
 * This file handles the Google Calendar integration for the salon booking app
 * It works behind the scenes without requiring user interaction
 */

(function() {
    // Google Calendar API configuration
    const GOOGLE_API_KEY = 'AIzaSyBf0yU_MxKg5_xAi5F_50NWIFXani8SNVY'; // Replace with your Google API Key
    const GOOGLE_CLIENT_ID = '272475247263-hfe3q59bj3o3hsqaa26epvljh3oq18jh.apps.googleusercontent.com'; // Replace with your Google Client ID
    const GOOGLE_CALENDAR_ID = 'c_574cc7eeed3acc2456f2537d389d5631441626db9edef74346e03ff0869f4130@group.calendar.google.com'; // Replace with your Calendar ID
    const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];
    const SCOPES = "https://www.googleapis.com/auth/calendar";
    
    let tokenClient;
    let gapiInited = false;
    let gisInited = false;
    let isAuthenticated = false;
    
    // Initialize the integration
    function initialize() {
        console.log('Initializing Google Calendar integration...');
        
        // Load the required libraries
        loadGapiAndGsiLibraries();
        
        // Listen for booking state changes
        setupEventListeners();
    }
    
    // Load the Google API and GSI libraries
    function loadGapiAndGsiLibraries() {
        // Check if scripts are already loaded
        if (typeof gapi !== 'undefined' && typeof google !== 'undefined') {
            initializeLibraries();
        } else {
            // Load GAPI script
            const gapiScript = document.createElement('script');
            gapiScript.src = 'https://apis.google.com/js/api.js';
            gapiScript.onload = () => {
                console.log('GAPI loaded');
                if (typeof google !== 'undefined') {
                    initializeLibraries();
                }
            };
            document.body.appendChild(gapiScript);
            
            // Load Google Identity Services script
            const gsiScript = document.createElement('script');
            gsiScript.src = 'https://accounts.google.com/gsi/client';
            gsiScript.onload = () => {
                console.log('GSI loaded');
                if (typeof gapi !== 'undefined') {
                    initializeLibraries();
                }
            };
            document.body.appendChild(gsiScript);
        }
    }
    
    // Initialize the libraries once they're loaded
    function initializeLibraries() {
        console.log('Initializing Google libraries...');
        
        // Initialize GAPI
        gapi.load('client', async () => {
            try {
                await gapi.client.init({
                    apiKey: GOOGLE_API_KEY,
                    discoveryDocs: DISCOVERY_DOCS,
                });
                gapiInited = true;
                console.log('GAPI initialized');
                checkInitialization();
            } catch (error) {
                console.error('Error initializing GAPI client:', error);
            }
        });
        
        // Initialize token client
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: SCOPES,
            callback: handleAuthResponse,
        });
        gisInited = true;
        console.log('GSI initialized');
        
        checkInitialization();
    }
    
    // Check if both libraries are initialized
    function checkInitialization() {
        if (gapiInited && gisInited) {
            console.log('All libraries initialized, trying silent authentication...');
            silentAuthentication();
        }
    }
    
    // Try silent authentication first
    function silentAuthentication() {
        if (gapi.client.getToken() !== null) {
            isAuthenticated = true;
            console.log('Already authenticated');
            onAuthenticationComplete();
        } else {
            console.log('Not authenticated, attempting silent authentication...');
            tokenClient.callback = handleAuthResponse;
            tokenClient.requestAccessToken({prompt: ''});
        }
    }
    
    // Handle authentication response
    function handleAuthResponse(response) {
        if (response.error !== undefined) {
            console.log('Silent authentication failed, will attempt with prompt when needed');
            return;
        }
        
        isAuthenticated = true;
        console.log('Authentication successful');
        onAuthenticationComplete();
    }
    
    // Actions to perform after authentication is complete
    function onAuthenticationComplete() {
        // Sync with calendar if booking state is available
        if (window.bookingState && window.bookingState.date) {
            fetchAvailableSlotsFromGoogleCalendar(window.bookingState.date, window.bookingState);
        }
        
        // Start periodic refresh
        startPeriodicRefresh();
    }
    
    // Authentication with prompt (used when needed for operations)
    function authenticateWithPrompt(callback) {
        if (isAuthenticated) {
            if (callback) callback();
            return;
        }
        
        console.log('Requesting authentication with prompt...');
        tokenClient.callback = (resp) => {
            if (resp.error !== undefined) {
                console.error('Authentication error:', resp);
                return;
            }
            
            isAuthenticated = true;
            console.log('Authentication successful');
            if (callback) callback();
        };
        
        tokenClient.requestAccessToken({prompt: 'consent'});
    }
    
    // Set up event listeners for the booking app
    function setupEventListeners() {
        // When a date is selected
        document.addEventListener('dateSelected', function(e) {
            if (e.detail && e.detail.date) {
                fetchAvailableSlotsFromGoogleCalendar(e.detail.date, window.bookingState);
            }
        });
        
        // When an appointment is booked
        document.addEventListener('appointmentBooked', function(e) {
            if (e.detail && e.detail.bookingData) {
                addEventToGoogleCalendar(e.detail.bookingData);
            }
        });
        
        // When an appointment is rescheduled
        document.addEventListener('appointmentRescheduled', function(e) {
            if (e.detail && e.detail.bookingData && e.detail.eventId) {
                updateEventInGoogleCalendar(e.detail.eventId, e.detail.bookingData);
            }
        });
        
        // When an appointment is canceled
        document.addEventListener('appointmentCanceled', function(e) {
            if (e.detail && e.detail.eventId) {
                deleteEventFromGoogleCalendar(e.detail.eventId);
            }
        });
    }
    
    // Fetch available slots from Google Calendar
    async function fetchAvailableSlotsFromGoogleCalendar(date, bookingState) {
        if (!isAuthenticated) {
            authenticateWithPrompt(() => fetchAvailableSlotsFromGoogleCalendar(date, bookingState));
            return [];
        }
        
        try {
            console.log(`Fetching booked slots for ${date}...`);
            
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
            const eventMap = {};
            
            if (events && events.length > 0) {
                for (let i = 0; i < events.length; i++) {
                    const event = events[i];
                    const start = new Date(event.start.dateTime || event.start.date);
                    const hour = start.getHours();
                    const minute = start.getMinutes();
                    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                    
                    bookedSlotsForDate.push(timeStr);
                    
                    // Map appointment IDs to event IDs for later reference
                    if (event.description && event.description.includes('Appointment ID:')) {
                        const appointmentIdMatch = event.description.match(/Appointment ID: ([A-Za-z0-9-]+)/);
                        if (appointmentIdMatch && appointmentIdMatch[1]) {
                            const appointmentId = appointmentIdMatch[1];
                            eventMap[appointmentId] = event.id;
                            
                            // Store in localStorage
                            storeAppointmentData(appointmentId, {
                                eventId: event.id,
                                date: date,
                                time: timeStr
                            });
                        }
                    }
                }
            }
            
            // Update booking state with booked slots
            if (bookingState) {
                if (!bookingState.bookedSlots[date]) {
                    bookingState.bookedSlots[date] = [];
                }
                
                // Merge with existing booked slots without duplicates
                bookedSlotsForDate.forEach(slot => {
                    if (!bookingState.bookedSlots[date].includes(slot)) {
                        bookingState.bookedSlots[date].push(slot);
                    }
                });
                
                // Regenerate time slots if on the time selection step
                if (bookingState.currentStep === 4) {
                    // Dispatch event to regenerate time slots
                    document.dispatchEvent(new CustomEvent('regenerateTimeSlots', {
                        detail: { date: date }
                    }));
                }
            }
            
            console.log(`Found ${bookedSlotsForDate.length} booked slots for ${date}`);
            return bookedSlotsForDate;
            
        } catch (error) {
            console.error('Error fetching events from Google Calendar:', error);
            return [];
        }
    }
    
    // Add event to Google Calendar
    async function addEventToGoogleCalendar(bookingData) {
        if (!isAuthenticated) {
            authenticateWithPrompt(() => addEventToGoogleCalendar(bookingData));
            return null;
        }
        
        try {
            console.log('Adding appointment to Google Calendar:', bookingData);
            
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
            
            // Store the event ID
            if (bookingData.appointmentId) {
                storeAppointmentData(bookingData.appointmentId, {
                    eventId: response.id,
                    date: bookingData.date,
                    time: bookingData.time
                });
            }
            
            return response.id; // Return the event ID for future reference
            
        } catch (error) {
            console.error('Error adding event to Google Calendar:', error);
            return null;
        }
    }
    
    // Update event in Google Calendar
    async function updateEventInGoogleCalendar(eventId, bookingData) {
        if (!isAuthenticated) {
            authenticateWithPrompt(() => updateEventInGoogleCalendar(eventId, bookingData));
            return false;
        }
        
        if (!eventId) {
            console.log('No event ID provided. Skipping calendar update.');
            return false;
        }
        
        try {
            console.log('Updating event in Google Calendar:', eventId, bookingData);
            
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
            
            // Update stored appointment data
            if (bookingData.appointmentId) {
                storeAppointmentData(bookingData.appointmentId, {
                    eventId: eventId,
                    date: bookingData.date,
                    time: bookingData.time
                });
            }
            
            return true;
            
        } catch (error) {
            console.error('Error updating event in Google Calendar:', error);
            return false;
        }
    }
    
    // Delete event from Google Calendar
    async function deleteEventFromGoogleCalendar(eventId) {
        if (!isAuthenticated) {
            authenticateWithPrompt(() => deleteEventFromGoogleCalendar(eventId));
            return false;
        }
        
        if (!eventId) {
            console.log('No event ID provided. Skipping calendar deletion.');
            return false;
        }
        
        try {
            console.log('Deleting event from Google Calendar:', eventId);
            
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
    
    // Start periodic refresh to keep calendar data in sync
    function startPeriodicRefresh() {
        // Refresh calendar data every 5 minutes
        const refreshInterval = 5 * 60 * 1000; // 5 minutes
        
        setInterval(() => {
            if (isAuthenticated && window.bookingState && window.bookingState.date) {
                // Refresh data for current date
                fetchAvailableSlotsFromGoogleCalendar(window.bookingState.date, window.bookingState);
                console.log('Google Calendar data refreshed at', new Date().toLocaleTimeString());
            }
        }, refreshInterval);
        
        console.log('Periodic Google Calendar refresh started');
    }
    
    // Helper function to store appointment data in localStorage
    function storeAppointmentData(appointmentId, data) {
        if (!appointmentId) return;
        
        try {
            let appointments = JSON.parse(localStorage.getItem('salonAppointments') || '{}');
            appointments[appointmentId] = data;
            localStorage.setItem('salonAppointments', JSON.stringify(appointments));
        } catch (error) {
            console.error('Error storing appointment data:', error);
        }
    }
    
    // Helper function to retrieve appointment data from localStorage
    function getAppointmentData(appointmentId) {
        if (!appointmentId) return null;
        
        try {
            let appointments = JSON.parse(localStorage.getItem('salonAppointments') || '{}');
            return appointments[appointmentId];
        } catch (error) {
            console.error('Error retrieving appointment data:', error);
            return null;
        }
    }
    
    // Helper function to remove appointment data from localStorage
    function removeAppointmentData(appointmentId) {
        if (!appointmentId) return;
        
        try {
            let appointments = JSON.parse(localStorage.getItem('salonAppointments') || '{}');
            delete appointments[appointmentId];
            localStorage.setItem('salonAppointments', JSON.stringify(appointments));
        } catch (error) {
            console.error('Error removing appointment data:', error);
        }
    }
    
    // Public API
    window.calendarIntegration = {
        addEventToGoogleCalendar,
        updateEventInGoogleCalendar,
        deleteEventFromGoogleCalendar,
        fetchAvailableSlotsFromGoogleCalendar,
        getAppointmentData,
        initialize
    };
    
    // Initialize the integration
    document.addEventListener('DOMContentLoaded', initialize);
})();
