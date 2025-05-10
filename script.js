document.addEventListener('DOMContentLoaded', function() {
    // Google Calendar API configuration
    const GOOGLE_API_KEY = 'AIzaSyBf0yU_MxKg5_xAi5F_50NWIFXani8SNVY'; // Replace with your Google API Key
    const GOOGLE_CLIENT_ID = '272475247263-hfe3q59bj3o3hsqaa26epvljh3oq18jh.apps.googleusercontent.com'; // Replace with your Google Client ID
    const GOOGLE_CALENDAR_ID = 'c_574cc7eeed3acc2456f2537d389d5631441626db9edef74346e03ff0869f4130@group.calendar.google.com'; // Replace with your Calendar ID
    const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];
    const SCOPES = "https://www.googleapis.com/auth/calendar";
    
    let tokenClient;
    let gapiInited = false;
    let gisInited = false;

    // State management
    const bookingState = {
        currentStep: 1,
        service: null,
        barber: null,
        date: null,
        time: null,
        addons: [],
        customerInfo: {
            firstName: '',
            lastName: '',
            email: '',
            phone: ''
        },
        smsConsent: false,
        totalPrice: 0,
        totalDuration: 0,
        bookedSlots: {}, // Format: "YYYY-MM-DD": ["10:00", "14:30"]
        appointmentId: null,
        // New properties for Google Calendar integration
        googleCalendarEventId: null,
        isAuthenticated: false
    };
    
    // Mock data for already booked slots
    // In production, this would come from your backend/database
    const mockBookedSlots = {
        "2025-04-29": ["10:00", "14:30"],
        "2025-04-30": ["09:00", "11:30", "15:00"],
        "2025-05-01": ["13:00", "16:30"],
    };
    
    // Initialize with mock data
    bookingState.bookedSlots = mockBookedSlots;
    
    // DOM Elements
    const steps = document.querySelectorAll('.booking-step');
    const stepContents = document.querySelectorAll('.step-content');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    // Initialize phone input with country flags
    const phoneInput = window.intlTelInput(document.getElementById('phone'), {
        initialCountry: "in",
        separateDialCode: true,
        utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/18.1.5/js/utils.js"
    });
    
    // Initialize date picker
    const datePicker = flatpickr("#date-picker", {
        minDate: "today",
        dateFormat: "Y-m-d",
        disable: [
            function(date) {
                // Disable weekends
                return date.getDay() === 0; // Sunday
            }
        ],
        onChange: function(selectedDates, dateStr) {
            bookingState.date = dateStr;
            updateSummary();
            
            // If using Google Calendar, fetch available slots
            if (bookingState.isAuthenticated) {
                fetchAvailableSlotsFromGoogleCalendar(dateStr);
            }
        }
    });
    
    // Google API initialization
    function initializeGoogleAPI() {
        gapi.load('client', initGapiClient);
        
        // Function to init tokenClient
        function initTokenClient() {
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: SCOPES,
                callback: '', // defined at request time
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
    }
    
    // Handle sign-in and enable buttons
    function maybeEnableButtons() {
        if (gapiInited && gisInited) {
            // Now we can use the Google Calendar API
            console.log('Google API initialized successfully');
            
            // Check if user is already authenticated
            if (gapi.client.getToken() !== null) {
                bookingState.isAuthenticated = true;
                console.log('User is already authenticated');
            }
        }
    }
    
    // Authenticate with Google
    function handleAuthClick() {
        tokenClient.callback = async (resp) => {
            if (resp.error !== undefined) {
                throw (resp);
            }
            bookingState.isAuthenticated = true;
            console.log('Authentication successful');
            
            // If date is already selected, fetch slots
            if (bookingState.date) {
                fetchAvailableSlotsFromGoogleCalendar(bookingState.date);
            }
        };

        if (gapi.client.getToken() === null) {
            // Prompt the user for consent
            tokenClient.requestAccessToken({prompt: 'consent'});
        } else {
            // Skip the consent prompt
            tokenClient.requestAccessToken({prompt: ''});
        }
    }
    
    // Fetch available slots from Google Calendar
    async function fetchAvailableSlotsFromGoogleCalendar(date) {
        if (!bookingState.isAuthenticated) {
            console.log('Not authenticated with Google. Using mock data.');
            return;
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
            
            if (events.length > 0) {
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
            bookingState.bookedSlots[date] = bookedSlotsForDate;
            
            // If we're on the time selection step, regenerate the time slots
            if (bookingState.currentStep === 4) {
                generateTimeSlots(date);
            }
            
        } catch (error) {
            console.error('Error fetching events from Google Calendar:', error);
        }
    }
    
    // Add an event to Google Calendar
    async function addEventToGoogleCalendar(bookingData) {
        if (!bookingState.isAuthenticated) {
            console.log('Not authenticated with Google. Skipping calendar event creation.');
            return null;
        }
        
        try {
            const startDateTime = new Date(`${bookingData.date}T${bookingData.time}`);
            const endDateTime = new Date(startDateTime.getTime() + bookingData.totalDuration * 60000);
            
            // Format add-ons for description if any
            let addonsText = '';
            if (bookingData.addons.length > 0) {
                addonsText = 'Add-ons: ' + bookingData.addons.map(addon => addon.name).join(', ');
            }
            
            // Create event resource
            const event = {
                'summary': `${bookingData.customerInfo.firstName} ${bookingData.customerInfo.lastName} - ${bookingData.service.name}`,
                'location': 'GoBarBerly Salon',
                'description': `Service: ${bookingData.service.name}\nBarber: ${bookingData.barber.name}\n${addonsText}\nCustomer Email: ${bookingData.customerInfo.email}\nCustomer Phone: ${bookingData.customerInfo.phone}\nAppointment ID: ${bookingData.appointmentId}`,
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
    }
    
    // Update an event in Google Calendar
    async function updateEventInGoogleCalendar(eventId, bookingData) {
        if (!bookingState.isAuthenticated || !eventId) {
            console.log('Not authenticated or no event ID provided. Skipping calendar update.');
            return false;
        }
        
        try {
            const startDateTime = new Date(`${bookingData.date}T${bookingData.time}`);
            const endDateTime = new Date(startDateTime.getTime() + bookingData.totalDuration * 60000);
            
            // Format add-ons for description if any
            let addonsText = '';
            if (bookingData.addons.length > 0) {
                addonsText = 'Add-ons: ' + bookingData.addons.map(addon => addon.name).join(', ');
            }
            
            // Create updated event resource
            const event = {
                'summary': `${bookingData.customerInfo.firstName} ${bookingData.customerInfo.lastName} - ${bookingData.service.name}`,
                'location': 'GoBarBerly Salon',
                'description': `Service: ${bookingData.service.name}\nBarber: ${bookingData.barber.name}\n${addonsText}\nCustomer Email: ${bookingData.customerInfo.email}\nCustomer Phone: ${bookingData.customerInfo.phone}\nAppointment ID: ${bookingData.appointmentId}`,
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
    }
    
    // Delete an event from Google Calendar
    async function deleteEventFromGoogleCalendar(eventId) {
        if (!bookingState.isAuthenticated || !eventId) {
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
    
    // Service Selection
    const serviceCards = document.querySelectorAll('.service-card');
    serviceCards.forEach(card => {
        card.addEventListener('click', () => {
            // Deselect all other cards
            serviceCards.forEach(c => c.classList.remove('selected'));
            // Select this card
            card.classList.add('selected');
            
            // Update state
            bookingState.service = {
                id: card.dataset.id,
                name: card.querySelector('.service-name').textContent,
                price: parseFloat(card.dataset.price),
                duration: parseInt(card.dataset.duration)
            };
            
            updateSummary();
        });
    });
    
    // Barber Selection
    const barberCards = document.querySelectorAll('.barber-card');
    barberCards.forEach(card => {
        card.addEventListener('click', () => {
            // Deselect all other cards
            barberCards.forEach(c => c.classList.remove('selected'));
            // Select this card
            card.classList.add('selected');
            
            // Update state
            bookingState.barber = {
                id: card.dataset.id,
                name: card.querySelector('.barber-name').textContent
            };
            
            updateSummary();
        });
    });
    
    // Generate time slots
    function generateTimeSlots(date) {
        const timeGrid = document.getElementById('time-slots');
        timeGrid.innerHTML = '';
        
        // Business hours: 9AM to 5PM
        const startHour = 9;
        const endHour = 17;
        const interval = 30; // 30 minutes per slot
        
        // Get booked slots for this date
        const bookedSlotsForDate = bookingState.bookedSlots[date] || [];
        
        // Get service duration (minutes)
        const serviceDuration = bookingState.service ? bookingState.service.duration : 30;
        
        // Generate time slots
        for (let hour = startHour; hour < endHour; hour++) {
            for (let minute = 0; minute < 60; minute += interval) {
                // Skip slots that would extend beyond closing time
                const slotTime = hour * 60 + minute;
                const endTime = slotTime + serviceDuration;
                if (endTime > endHour * 60) continue;
                
                const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                const timeSlot = document.createElement('div');
                timeSlot.className = 'time-slot';
                timeSlot.textContent = timeStr;
                timeSlot.dataset.time = timeStr;
                
                // Check if this slot is already booked
                let isDisabled = false;
                
                // Check if this slot would overlap with any booked slots
                for (const bookedTime of bookedSlotsForDate) {
                    const [bookedHour, bookedMinute] = bookedTime.split(':').map(Number);
                    const bookedSlotTime = bookedHour * 60 + bookedMinute;
                    
                    // Check if the current slot overlaps with this booked slot
                    if (
                        (slotTime <= bookedSlotTime && bookedSlotTime < endTime) || 
                        (bookedSlotTime <= slotTime && slotTime < bookedSlotTime + 30)
                    ) {
                        isDisabled = true;
                        break;
                    }
                }
                
                if (isDisabled) {
                    timeSlot.classList.add('disabled');
                } else {
                    timeSlot.addEventListener('click', () => {
                        // Only allow selection if not disabled
                        if (!timeSlot.classList.contains('disabled')) {
                            // Deselect all other time slots
                            document.querySelectorAll('.time-slot').forEach(slot => {
                                slot.classList.remove('selected');
                            });
                            
                            // Select this time slot
                            timeSlot.classList.add('selected');
                            
                            // Update state
                            bookingState.time = timeStr;
                            updateSummary();
                        }
                    });
                }
                
                timeGrid.appendChild(timeSlot);
            }
        }
    }
    
    // Add-on Selection
    const addonCards = document.querySelectorAll('.addon-card');
    addonCards.forEach(card => {
        card.addEventListener('click', () => {
            // Toggle selection
            card.classList.toggle('selected');
            
            // Update state
            const addonId = card.dataset.id;
            const addonName = card.querySelector('.addon-name').textContent;
            const addonPrice = parseFloat(card.dataset.price);
            const addonDuration = parseInt(card.dataset.duration);
            
            if (card.classList.contains('selected')) {
                // Add add-on
                bookingState.addons.push({
                    id: addonId,
                    name: addonName,
                    price: addonPrice,
                    duration: addonDuration
                });
            } else {
                // Remove add-on
                bookingState.addons = bookingState.addons.filter(addon => addon.id !== addonId);
            }
            
            updateSummary();
        });
    });
    
    // Form validation
    const customerForm = document.getElementById('customer-form');
    const firstNameInput = document.getElementById('first-name');
    const lastNameInput = document.getElementById('last-name');
    const emailInput = document.getElementById('email');
    
    // Event listeners for form inputs
    firstNameInput.addEventListener('input', () => {
        bookingState.customerInfo.firstName = firstNameInput.value;
        updateSummary();
    });
    
    lastNameInput.addEventListener('input', () => {
        bookingState.customerInfo.lastName = lastNameInput.value;
        updateSummary();
    });
    
    emailInput.addEventListener('input', () => {
        bookingState.customerInfo.email = emailInput.value;
    });
    
    document.getElementById('phone').addEventListener('input', () => {
        bookingState.customerInfo.phone = phoneInput.getNumber();
    });
    // Add SMS consent checkbox event listener
    document.getElementById('sms-consent').addEventListener('change', function() {
        bookingState.smsConsent = this.checked;
    });
    // Validate form
    function validateForm() {
        let isValid = true;
        
        // First Name
        if (!firstNameInput.value.trim()) {
            document.getElementById('first-name-error').style.display = 'block';
            isValid = false;
        } else {
            document.getElementById('first-name-error').style.display = 'none';
        }
        
        // Last Name
        if (!lastNameInput.value.trim()) {
            document.getElementById('last-name-error').style.display = 'block';
            isValid = false;
        } else {
            document.getElementById('last-name-error').style.display = 'none';
        }
        
        // Email
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailInput.value.trim() || !emailPattern.test(emailInput.value)) {
            document.getElementById('email-error').style.display = 'block';
            isValid = false;
        } else {
            document.getElementById('email-error').style.display = 'none';
        }
        
        // Phone
        if (!phoneInput.isValidNumber()) {
            document.getElementById('phone-error').style.display = 'block';
            isValid = false;
        } else {
            document.getElementById('phone-error').style.display = 'none';
        }
        
        return isValid;
    }
    
    // Calculate total duration
    function calculateTotalDuration() {
        let duration = 0;
        
        // Add service duration
        if (bookingState.service) {
            duration += bookingState.service.duration;
        }
        
        // Add add-on durations
        bookingState.addons.forEach(addon => {
            duration += addon.duration;
        });
        
        return duration;
    }
    
    // Format duration to hours and minutes
    function formatDuration(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        
        if (hours > 0) {
            return `${hours} hr${hours > 1 ? 's' : ''} ${mins > 0 ? `${mins} min${mins > 1 ? 's' : ''}` : ''}`;
        } else {
            return `${mins} min${mins > 1 ? 's' : ''}`;
        }
    }
    
    // Update booking summary
    function updateSummary() {
        // Calculate total price
        let total = bookingState.service ? bookingState.service.price : 0;
        
        // Add add-on prices
        bookingState.addons.forEach(addon => {
            total += addon.price;
        });
        
        // Calculate total duration
        const totalDuration = calculateTotalDuration();
        
        bookingState.totalPrice = total;
        bookingState.totalDuration = totalDuration;
        
        // Update summary elements
        document.getElementById('summary-service').textContent = bookingState.service ? bookingState.service.name : '-';
        document.getElementById('summary-barber').textContent = bookingState.barber ? bookingState.barber.name : '-';
        document.getElementById('summary-date').textContent = bookingState.date || '-';
        document.getElementById('summary-time').textContent = bookingState.time || '-';
        document.getElementById('summary-duration').textContent = totalDuration ? formatDuration(totalDuration) : '-';
        
        // Update add-ons
        if (bookingState.addons.length > 0) {
            let addonsText = '';
            bookingState.addons.forEach((addon, index) => {
                addonsText += `${addon.name} (₹${addon.price})`;
                if (index < bookingState.addons.length - 1) {
                    addonsText += ', ';
                }
            });
            document.getElementById('summary-addons').textContent = addonsText;
            document.getElementById('addons-container').style.display = 'flex';
        } else {
            document.getElementById('summary-addons').textContent = '-';
            document.getElementById('addons-container').style.display = 'flex';
        }
        
        // Update total
        document.getElementById('summary-total').textContent = `₹${total}`;
    }
    
    // Update confirmation details
    function updateConfirmation() {
        document.getElementById('conf-service').textContent = bookingState.service.name;
        document.getElementById('conf-barber').textContent = bookingState.barber.name;
        document.getElementById('conf-date').textContent = bookingState.date;
        document.getElementById('conf-time').textContent = bookingState.time;
        document.getElementById('conf-name').textContent = `${bookingState.customerInfo.firstName} ${bookingState.customerInfo.lastName}`;
        document.getElementById('conf-total').textContent = `₹${bookingState.totalPrice}`;
        document.getElementById('conf-duration').textContent = formatDuration(bookingState.totalDuration);
        
        // Update add-ons
        if (bookingState.addons.length > 0) {
            let addonsText = '';
            bookingState.addons.forEach((addon, index) => {
                addonsText += `${addon.name} (₹${addon.price})`;
                if (index < bookingState.addons.length - 1) {
                    addonsText += ', ';
                }
            });
            document.getElementById('conf-addons').textContent = addonsText;
            document.getElementById('conf-addons-container').style.display = 'flex';
        } else {
            document.getElementById('conf-addons').textContent = '-';
            document.getElementById('conf-addons-container').style.display = 'flex';
        }
    }
    
    // Navigation functions
    function goToStep(stepNumber) {
        // Hide all step contents
        stepContents.forEach(content => {
            content.classList.remove('active');
        });
        
        // Show the current step content
        if (stepNumber === 'confirmation') {
            document.getElementById('confirmation').classList.add('active');
            updateConfirmation();
        } else {
            document.getElementById(`step${stepNumber}`).classList.add('active');
            
            // If on time selection step, generate time slots
            if (stepNumber === 4 && bookingState.date) {
                generateTimeSlots(bookingState.date);
            }
        }
        
        // Update step indicators
        steps.forEach(step => {
            const stepNum = parseInt(step.dataset.step);
            
            if (stepNum < bookingState.currentStep) {
                step.classList.add('completed');
                step.classList.remove('active');
            } else if (stepNum === bookingState.currentStep) {
                step.classList.add('active');
                step.classList.remove('completed');
            } else {
                step.classList.remove('active', 'completed');
            }
        });
        
        // Update button states
        prevBtn.disabled = bookingState.currentStep === 1;
        
        if (stepNumber === 'confirmation') {
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
        } else {
            prevBtn.style.display = 'block';
            nextBtn.style.display = 'block';
            
            // Change next button text on last step
            if (bookingState.currentStep === 6) {
                nextBtn.textContent = 'Book Appointment';
            } else {
                nextBtn.textContent = 'Next';
            }
        }
    }
    
    // Update step when clicking on progress indicator
    steps.forEach(step => {
        step.addEventListener('click', () => {
            const clickedStep = parseInt(step.dataset.step);
            
            // Only allow going back to previous steps or current step
            if (clickedStep <= bookingState.currentStep) {
                bookingState.currentStep = clickedStep;
                goToStep(clickedStep);
            }
        });
    });
    
    // Next button click handler
    nextBtn.addEventListener('click', () => {
        // Validate current step
        let canProceed = true;
        
        switch (bookingState.currentStep) {
            case 1:
                canProceed = bookingState.service !== null;
                break;
            case 2:
                canProceed = bookingState.barber !== null;
                break;
            case 3:
                canProceed = bookingState.date !== null;
                break;
            case 4:
                canProceed = bookingState.time !== null;
                break;
            case 5:
                // Add-ons are optional
                canProceed = true;
                break;
            case 6:
                canProceed = validateForm();
                if (canProceed) {
                    // Submit the booking
                    submitBooking();
                    goToStep('confirmation');
                    return;
                }
                break;
        }
        
        if (canProceed) {
            bookingState.currentStep++;
            goToStep(bookingState.currentStep);
        } else {
            // Add visual feedback for the error
            const currentStepElement = document.querySelector(`.booking-step[data-step="${bookingState.currentStep}"]`);
            currentStepElement.classList.add('error');
            setTimeout(() => {
                currentStepElement.classList.remove('error');
            }, 500);
        }
    });
    
    // Previous button click handler
    prevBtn.addEventListener('click', () => {
        if (bookingState.currentStep > 1) {
            bookingState.currentStep--;
            goToStep(bookingState.currentStep);
        }
    });
    
    // Function to generate a unique appointment ID
    function generateAppointmentId() {
        return 'APT-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    }
    
    // Function to submit booking to backend
    async function submitBooking() {
        // Generate a unique appointment ID
        bookingState.appointmentId = generateAppointmentId();
        
        // Create booking data object
        const bookingData = {
            appointmentId: bookingState.appointmentId,
            service: bookingState.service,
            barber: bookingState.barber,
            date: bookingState.date,
            time: bookingState.time,
            addons: bookingState.addons,
            customerInfo: bookingState.customerInfo,
            totalPrice: bookingState.totalPrice,
            totalDuration: bookingState.totalDuration,
            smsConsent: bookingState.smsConsent
        };
        
        // In a real application, this would be sent to your backend
        console.log('Booking submitted:', bookingData);
        
        // Add to Google Calendar if authenticated
        if (bookingState.isAuthenticated) {
            try {
                const eventId = await addEventToGoogleCalendar(bookingData);
                if (eventId) {
                    bookingState.googleCalendarEventId = eventId;
                    console.log('Event added to Google Calendar with ID:', eventId);
                }
            } catch (error) {
                console.error('Failed to add event to Google Calendar:', error);
            }
        }
        
        // Mock successful booking - Add the time slot to booked slots
        if (!bookingState.bookedSlots[bookingState.date]) {
            bookingState.bookedSlots[bookingState.date] = [];
        }
        bookingState.bookedSlots[bookingState.date].push(bookingState.time);
        
        // Send confirmation emails and SMS
        sendConfirmations(bookingData);
    }
    
    // Send confirmations
    function sendConfirmations(bookingData) {
        console.log('Sending confirmations for:', bookingData);
        
        // Email confirmation
        sendEmailConfirmation(bookingData);
        
        // Only send SMS if consent was given
        if (bookingData.smsConsent) {
            // SMS confirmation
            sendSMSConfirmation(bookingData);
            
            // WhatsApp confirmation (if applicable)
            sendWhatsAppConfirmation(bookingData);
        }
    }
    
    // Send email confirmation function - Uses Zapier webhook
    function sendEmailConfirmation(bookingData) {
        // Create query parameters
        const params = new URLSearchParams({
            messageType: 'email',
            customerEmail: bookingData.customerInfo.email,
            customerName: `${bookingData.customerInfo.firstName} ${bookingData.customerInfo.lastName}`,
            service: bookingData.service.name,
            barber: bookingData.barber.name,
            date: bookingData.date,
            time: bookingData.time,
            duration: bookingData.totalDuration.toString(),
            price: bookingData.totalPrice.toString(),
            addons: bookingData.addons.map(addon => addon.name).join(', '),
            appointmentId: bookingData.appointmentId
        });
        
        // Add rescheduling info if applicable
        if (bookingData.isRescheduled) {
            params.append('isRescheduled', 'true');
            params.append('oldDate', bookingData.oldDate);
            params.append('oldTime', bookingData.oldTime);
        }
        
        // Send data to Zapier webhook with query parameters
        fetch(`https://hooks.zapier.com/hooks/catch/22747438/2pcer1x/?${params.toString()}`, {
            method: 'GET'  // Using GET for query parameters
        })
        .then(response => {
            if (response.ok) {
                console.log('Email confirmation request sent successfully');
            } else {
                console.error('Failed to send email confirmation request');
            }
        })
        .catch(error => {
            console.error('Error sending email confirmation:', error);
        });
    }
    
    // Send SMS confirmation function - Uses Zapier webhook
    function sendSMSConfirmation(bookingData) {
        // Create query parameters
        const params = new URLSearchParams({
            messageType: 'sms',
            phoneNumber: bookingData.customerInfo.phone,
            customerName: `${bookingData.customerInfo.firstName} ${bookingData.customerInfo.lastName}`,
            service: bookingData.service.name,
            barber: bookingData.barber.name,
            date: bookingData.date,
            time: bookingData.time,
            appointmentId: bookingData.appointmentId,
            consentTimestamp: new Date().toISOString()
        });
        
        // Add rescheduling info if applicable
        if (bookingData.isRescheduled) {
            params.append('isRescheduled', 'true');
            params.append('oldDate', bookingData.oldDate);
            params.append('oldTime', bookingData.oldTime);
        }
        
        // Send data to Zapier webhook with query parameters
        fetch(`https://hooks.zapier.com/hooks/catch/22747438/2pcer1x/?${params.toString()}`, {
            method: 'GET'  // Using GET for query parameters
        })
        .then(response => {
            if (response.ok) {
                console.log('SMS confirmation request sent successfully');
            } else {
                console.error('Failed to send SMS confirmation request');
            }
        })
        .catch(error => {
            console.error('Error sending SMS confirmation:', error);
        });
    }
    
    // Send WhatsApp confirmation function - Uses Zapier webhook
    function sendWhatsAppConfirmation(bookingData) {
        // Create query parameters
        const params = new URLSearchParams({
            messageType: 'whatsapp',
            phoneNumber: bookingData.customerInfo.phone,
            customerName: `${bookingData.customerInfo.firstName} ${bookingData.customerInfo.lastName}`,
            service: bookingData.service.name,
            barber: bookingData.barber.name,
            date: bookingData.date,
            time: bookingData.time,
            price: bookingData.totalPrice.toString(),
            appointmentId: bookingData.appointmentId
        });
        
        // Add rescheduling info if applicable
        if (bookingData.isRescheduled) {
            params.append('isRescheduled', 'true');
            params.append('oldDate', bookingData.oldDate);
            params.append('oldTime', bookingData.oldTime);
        }
        
        // Send data to Zapier webhook with query parameters
        fetch(`https://hooks.zapier.com/hooks/catch/22747438/2pcer1x/?${params.toString()}`, {
            method: 'GET'  // Using GET for query parameters
        })
        .then(response => {
            if (response.ok) {
                console.log('WhatsApp confirmation request sent successfully');
            } else {
                console.error('Failed to send WhatsApp confirmation request');
            }
        })
        .catch(error => {
            console.error('Error sending WhatsApp confirmation:', error);
        });
    }
    
    // Add to Calendar button handler
    document.getElementById('add-to-calendar').addEventListener('click', function() {
        const startDateTime = new Date(`${bookingState.date}T${bookingState.time}`);
        const endDateTime = new Date(startDateTime.getTime() + bookingState.totalDuration * 60000);
        
        const startDateTimeStr = startDateTime.toISOString().replace(/-|:|\.\d+/g, '');
        const endDateTimeStr = endDateTime.toISOString().replace(/-|:|\.\d+/g, '');
        
        const calendarEvent = {
            title: `Salon Appointment: ${bookingState.service.name}`,
            description: `Appointment with ${bookingState.barber.name}\n${bookingState.addons.length > 0 ? 'Add-ons: ' + bookingState.addons.map(a => a.name).join(', ') : ''}`,
            location: 'GoBarBerly Salon',
            start: startDateTimeStr,
            end: endDateTimeStr
        };
        
        // Create Google Calendar URL
        const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(calendarEvent.title)}&dates=${calendarEvent.start}/${calendarEvent.end}&details=${encodeURIComponent(calendarEvent.description)}&location=${encodeURIComponent(calendarEvent.location)}`;
        
        // Create iCal data
        const icalData = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:${calendarEvent.title}
DTSTART:${calendarEvent.start}
DTEND:${calendarEvent.end}
DESCRIPTION:${calendarEvent.description}
LOCATION:${calendarEvent.location}
END:VEVENT
END:VCALENDAR`;
        
        // For Google Calendar: open in new tab
        window.open(googleCalendarUrl, '_blank');
        
        // For iCal: create a downloadable file
        const blob = new Blob([icalData], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `appointment_${bookingState.appointmentId}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
    
    // Reschedule button handler
    document.getElementById('reschedule-btn').addEventListener('click', async function() {
        // Store old date and time for later reference (to free up the slot)
        const oldDate = bookingState.date;
        const oldTime = bookingState.time;
        
        // Reset to step 3 (date selection)
        bookingState.currentStep = 3;
        goToStep(3);
        
        // Show navigation buttons again
        prevBtn.style.display = 'block';
        nextBtn.style.display = 'block';
        nextBtn.textContent = 'Next';
        
        // Override the next button functionality temporarily for rescheduling
        const originalNextFn = nextBtn.onclick;
        nextBtn.onclick = async function() {
            // Normal next button behavior for steps 3-5
            if (bookingState.currentStep >= 3 && bookingState.currentStep <= 5) {
                // Use the existing next button logic
                const event = new Event('click');
                nextBtn.dispatchEvent(event);
            } 
            // When confirming the new appointment time (after step 6)
            else if (bookingState.currentStep === 6) {
                // Validate form
                if (validateForm()) {
                    // Remove the old booking slot
                    if (oldDate && oldTime) {
                        const bookedSlotsForOldDate = bookingState.bookedSlots[oldDate] || [];
                        const oldIndex = bookedSlotsForOldDate.indexOf(oldTime);
                        if (oldIndex > -1) {
                            bookedSlotsForOldDate.splice(oldIndex, 1);
                            console.log(`Freed up slot: ${oldDate} at ${oldTime}`);
                        }
                    }
                    
                    // Update the Google Calendar event if we have an ID
                    if (bookingState.googleCalendarEventId) {
                        try {
                            const bookingData = {
                                appointmentId: bookingState.appointmentId,
                                service: bookingState.service,
                                barber: bookingState.barber,
                                date: bookingState.date,
                                time: bookingState.time,
                                addons: bookingState.addons,
                                customerInfo: bookingState.customerInfo,
                                totalPrice: bookingState.totalPrice,
                                totalDuration: bookingState.totalDuration
                            };
                            
                            const updated = await updateEventInGoogleCalendar(
                                bookingState.googleCalendarEventId, 
                                bookingData
                            );
                            
                            if (updated) {
                                console.log('Google Calendar event updated successfully');
                            } else {
                                console.warn('Failed to update Google Calendar event');
                            }
                        } catch (error) {
                            console.error('Error updating Google Calendar event:', error);
                        }
                    }
                    
                    // Add the new booking slot
                    if (!bookingState.bookedSlots[bookingState.date]) {
                        bookingState.bookedSlots[bookingState.date] = [];
                    }
                    bookingState.bookedSlots[bookingState.date].push(bookingState.time);
                    
                    // Send reschedule notifications
                    const bookingData = {
                        appointmentId: bookingState.appointmentId,
                        service: bookingState.service,
                        barber: bookingState.barber,
                        date: bookingState.date,
                        time: bookingState.time,
                        addons: bookingState.addons,
                        customerInfo: bookingState.customerInfo,
                        totalPrice: bookingState.totalPrice,
                        totalDuration: bookingState.totalDuration,
                        smsConsent: bookingState.smsConsent,
                        isRescheduled: true,
                        oldDate: oldDate,
                        oldTime: oldTime
                    };
                    
                    sendConfirmations(bookingData);
                    
                    // Show the confirmation step
                    goToStep('confirmation');
                    
                    // Reset the next button function
                    nextBtn.onclick = originalNextFn;
                }
            }
        };
    });
    
    // Cancel button handler
    document.getElementById('cancel-btn').addEventListener('click', async function() {
        if (confirm('Are you sure you want to cancel your appointment?')) {
            // Remove the booking from booked slots
            const bookedSlotsForDate = bookingState.bookedSlots[bookingState.date] || [];
            const index = bookedSlotsForDate.indexOf(bookingState.time);
            if (index > -1) {
                bookedSlotsForDate.splice(index, 1);
                console.log(`Freed up slot: ${bookingState.date} at ${bookingState.time}`);
            }
            
            // Delete the event from Google Calendar if we have an ID
            if (bookingState.googleCalendarEventId) {
                try {
                    const deleted = await deleteEventFromGoogleCalendar(bookingState.googleCalendarEventId);
                    if (deleted) {
                        console.log('Google Calendar event deleted successfully');
                    } else {
                        console.warn('Failed to delete Google Calendar event');
                    }
                } catch (error) {
                    console.error('Error deleting Google Calendar event:', error);
                }
            }
            
            // Send cancellation notifications
            const bookingData = {
                appointmentId: bookingState.appointmentId,
                service: bookingState.service,
                barber: bookingState.barber,
                date: bookingState.date,
                time: bookingState.time,
                customerInfo: bookingState.customerInfo,
                smsConsent: bookingState.smsConsent,
                isCancelled: true
            };
            
            // Send cancellation notifications
            if (bookingData.smsConsent) {
                // Create query parameters for cancellation
                const params = new URLSearchParams({
                    messageType: 'cancellation',
                    phoneNumber: bookingData.customerInfo.phone,
                    customerName: `${bookingData.customerInfo.firstName} ${bookingData.customerInfo.lastName}`,
                    appointmentId: bookingData.appointmentId,
                    date: bookingData.date,
                    time: bookingData.time
                });
                
                // Send data to Zapier webhook with query parameters
                fetch(`https://hooks.zapier.com/hooks/catch/22747438/2pcer1x/?${params.toString()}`, {
                    method: 'GET'
                })
                .then(response => {
                    if (response.ok) {
                        console.log('Cancellation notification sent successfully');
                    } else {
                        console.error('Failed to send cancellation notification');
                    }
                })
                .catch(error => {
                    console.error('Error sending cancellation notification:', error);
                });
            }
            
            // Reset to step 1
            bookingState.currentStep = 1;
            
            // Clear all selections
            document.querySelectorAll('.service-card, .barber-card, .addon-card, .time-slot').forEach(card => {
                card.classList.remove('selected');
            });
            
            // Clear form fields
            document.getElementById('first-name').value = '';
            document.getElementById('last-name').value = '';
            document.getElementById('email').value = '';
            document.getElementById('phone').value = '';
            
            // Reset booking state
            bookingState.service = null;
            bookingState.barber = null;
            bookingState.date = null;
            bookingState.time = null;
            bookingState.addons = [];
            bookingState.customerInfo = {
                firstName: '',
                lastName: '',
                email: '',
                phone: ''
            };
            bookingState.googleCalendarEventId = null;
            
            // Go to step 1
            goToStep(1);
            
            // Show navigation buttons again
            prevBtn.style.display = 'block';
            nextBtn.style.display = 'block';
            
            // Update summary
            updateSummary();
            
            alert('Your appointment has been cancelled.');
        }
    });
    
    // Initialize the booking form
    updateSummary();
    goToStep(1);
    
    // Initialize Google API if script is loaded
    if (typeof gapi !== 'undefined') {
        initializeGoogleAPI();
    } else {
        console.warn('Google API not loaded. Calendar integration will be disabled.');
    }
});
