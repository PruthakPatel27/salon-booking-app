// Google Calendar API integration using API Key only
(function() {
    // Google Calendar API configuration - Your Calendar ID
    const CALENDAR_ID = '1b0facc4b0d9a943d9c1ec34d2a4b0722625eaec57b3ac4a28467ae1ed8282a8@group.calendar.google.com';
    
    // API Key for authentication - this is the simplest approach
    const API_KEY = 'AIzaSyCIB0VXUzsQjxrz9g8QIzeu8UVf9ohbWgo';
    
    // Create global googleCalendarIntegration object
    window.googleCalendarIntegration = {
        isAuthenticated: false,
        
        // Initialize Google API
        initializeGoogleAPI: function() {
            console.log('Initializing Google Calendar integration');
            
            // Load the GAPI script if not already loaded
            if (typeof gapi === 'undefined') {
                const script = document.createElement('script');
                script.src = 'https://apis.google.com/js/api.js';
                script.onload = () => {
                    this.loadGapiClient();
                };
                document.head.appendChild(script);
            } else {
                this.loadGapiClient();
            }
        },
        
        // Load the GAPI client
        loadGapiClient: function() {
            gapi.load('client', () => {
                gapi.client.init({
                    apiKey: API_KEY,
                    discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"]
                }).then(() => {
                    console.log('Google Calendar API initialized successfully');
                    this.isAuthenticated = true;
                    
                    // Initialize booking state if available
                    if (window.bookingState) {
                        window.bookingState.isAuthenticated = true;
                        
                        // If date is already selected, fetch slots
                        if (window.bookingState.date) {
                            this.fetchAvailableSlotsFromGoogleCalendar(window.bookingState.date, window.bookingState);
                        }
                    }
                }).catch(error => {
                    console.error('Error initializing Google Calendar API:', error);
                });
            });
        },
        
        // Fetch available slots from Google Calendar
        fetchAvailableSlotsFromGoogleCalendar: function(date, bookingState) {
            if (!this.isAuthenticated) {
                console.log('API not initialized yet, waiting...');
                setTimeout(() => {
                    this.fetchAvailableSlotsFromGoogleCalendar(date, bookingState);
                }, 500);
                return;
            }
            
            console.log('Fetching available slots for date:', date);
            
            // Get the start and end of the day in ISO format
            const timeMin = new Date(`${date}T00:00:00`).toISOString();
            const timeMax = new Date(`${date}T23:59:59`).toISOString();
            
            gapi.client.calendar.events.list({
                'calendarId': CALENDAR_ID,
                'timeMin': timeMin,
                'timeMax': timeMax,
                'showDeleted': false,
                'singleEvents': true,
                'orderBy': 'startTime'
            }).then(response => {
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
            }).catch(error => {
                console.error('Error fetching events from Google Calendar:', error);
                return [];
            });
        },
        
        // Add an event to Google Calendar
        addEventToGoogleCalendar: function(bookingData) {
            return new Promise((resolve, reject) => {
                if (!this.isAuthenticated) {
                    console.log('API not initialized yet, waiting...');
                    setTimeout(() => {
                        this.addEventToGoogleCalendar(bookingData)
                            .then(resolve)
                            .catch(reject);
                    }, 500);
                    return;
                }
                
                console.log('Adding event to Google Calendar for booking:', bookingData.appointmentId);
                
                const startDateTime = new Date(`${bookingData.date}T${bookingData.time}`);
                const endDateTime = new Date(startDateTime.getTime() + bookingData.totalDuration * 60000);
                
                // Format add-ons for description if any
                let addonsText = '';
                if (bookingData.addons && bookingData.addons.length > 0) {
                    addonsText = 'Add-ons: ' + bookingData.addons.map(addon => addon.name).join(', ') + '\n';
                }
                
                // Create event resource
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
                    'colorId': '6' // 6 is Tangerine (orange color)
                };
                
                gapi.client.calendar.events.insert({
                    'calendarId': CALENDAR_ID,
                    'resource': event
                }).then(response => {
                    console.log('Event created: ' + response.result.htmlLink);
                    resolve(response.result.id);
                }).catch(error => {
                    console.error('Error adding event to Google Calendar:', error);
                    resolve(null); // Resolve with null instead of rejecting
                });
            });
        },
        
        // Update an event in Google Calendar
        updateEventInGoogleCalendar: function(eventId, bookingData) {
            return new Promise((resolve, reject) => {
                if (!this.isAuthenticated || !eventId) {
                    console.log('API not initialized or no event ID provided. Skipping calendar update.');
                    resolve(false);
                    return;
                }
                
                console.log(`Updating event ${eventId} for booking ${bookingData.appointmentId}`);
                
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
                
                gapi.client.calendar.events.update({
                    'calendarId': CALENDAR_ID,
                    'eventId': eventId,
                    'resource': event
                }).then(response => {
                    console.log('Event updated: ' + response.result.htmlLink);
                    resolve(true);
                }).catch(error => {
                    console.error('Error updating event in Google Calendar:', error);
                    resolve(false);
                });
            });
        },
        
        // Delete an event from Google Calendar
        deleteEventFromGoogleCalendar: function(eventId) {
            return new Promise((resolve, reject) => {
                if (!this.isAuthenticated || !eventId) {
                    console.log('API not initialized or no event ID provided. Skipping calendar deletion.');
                    resolve(false);
                    return;
                }
                
                console.log(`Deleting event ${eventId} from Google Calendar`);
                
                gapi.client.calendar.events.delete({
                    'calendarId': CALENDAR_ID,
                    'eventId': eventId
                }).then(() => {
                    console.log('Event deleted successfully');
                    resolve(true);
                }).catch(error => {
                    console.error('Error deleting event from Google Calendar:', error);
                    resolve(false);
                });
            });
        }
    };
    
    // Initialize when document is ready
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM content loaded, initializing Google Calendar integration');
        
        // Initialize with a delay to ensure page is fully loaded
        setTimeout(() => {
            window.googleCalendarIntegration.initializeGoogleAPI();
        }, 500);
    });
})();
