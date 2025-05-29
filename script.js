document.addEventListener('DOMContentLoaded', function() {
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
        // Properties for Google Calendar integration
        googleCalendarEventId: null,
        isAuthenticated: false
    };
    
    // DOM Elements
    const steps = document.querySelectorAll('.booking-step');
    const stepContents = document.querySelectorAll('.step-content');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
// Initialize phone input with country flags
const phoneInput = window.intlTelInput(document.getElementById('phone'), {
    initialCountry: "auto", // Auto-detect country based on IP
    geoIpLookup: function(callback) {
        fetch("https://ipapi.co/json")
            .then(response => response.json())
            .then(data => callback(data.country_code))
            .catch(() => callback("us")); // Default to US if detection fails
    },
    preferredCountries: ["us", "in"], // US and India at the top
    separateDialCode: false, // Don't separate the dial code
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
    onChange: async function(selectedDates, dateStr) {
        bookingState.date = dateStr;
        
        try {
            // Show loading indicator if you have one
            // For example: document.getElementById('time-slots').innerHTML = '<div class="loading">Loading time slots...</div>';
            
            // Fetch booked slots from Google Calendar using your Firebase Function
            const response = await fetch(`https://getevents-is52ejehnq-uc.a.run.app?date=${dateStr}`);
            
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                // Update booking state with the booked slots
                bookingState.bookedSlots[dateStr] = result.bookedSlots.map(slot => slot.time);
                console.log(`Fetched ${result.bookedSlots.length} booked slots for ${dateStr}:`, result.bookedSlots);
            } else {
                console.error('Error fetching booked slots:', result.error);
                // Use any existing data as fallback
            }
        } catch (error) {
            console.error('Error fetching booked slots from API:', error);
            // If API call fails, proceed with any existing booked slots data
        } finally {
            // Generate time slots based on the updated booked slots
            if (typeof generateTimeSlots === 'function') {
                generateTimeSlots(dateStr);
            }
            
            // Update the booking summary
            updateSummary();
        }
    }
});

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
    
// MINIMAL FIX: Only replace the generateTimeSlots function with this:

function generateTimeSlots(date) {
    const timeGrid = document.getElementById('time-slots');
    timeGrid.innerHTML = '';
    
    // Business hours: 9AM to 5PM
    const startHour = 9;
    const endHour = 17;
    const interval = 10; // 10 minutes per slot
    
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
            
            // Check if this slot would conflict with any booked slots
            let isDisabled = false;
            
            // Check if the current slot would overlap with any booked slots
            for (const bookedTime of bookedSlotsForDate) {
                const [bookedHour, bookedMinute] = bookedTime.split(':').map(Number);
                const bookedSlotTime = bookedHour * 60 + bookedMinute;
                
                // Check if new appointment overlaps with existing appointment
                // Assume existing appointments are 30 minutes (will fix this later)
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
    // Only use international format if valid
    if (phoneInput.isValidNumber()) {
        bookingState.customerInfo.phone = phoneInput.getNumber();
    } else {
        // Fallback to raw input
        bookingState.customerInfo.phone = document.getElementById('phone').value;
    }
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
    // Validate phone number before submission
    const phoneNumber = phoneInput.isValidNumber() 
        ? phoneInput.getNumber(intlTelInputUtils.numberFormat.E164) 
        : document.getElementById('phone').value;
    
    // Generate a unique appointment ID
    bookingState.appointmentId = generateAppointmentId();
    
    // Create booking data object with correct phone number
    const bookingData = {
        appointmentId: bookingState.appointmentId,
        service: bookingState.service,
        barber: bookingState.barber,
        date: bookingState.date,
        time: bookingState.time,
        addons: bookingState.addons,
        customerInfo: {
            firstName: bookingState.customerInfo.firstName,
            lastName: bookingState.customerInfo.lastName,
            email: bookingState.customerInfo.email,
            phone: phoneNumber // Use the validated phone number
        },
        totalPrice: bookingState.totalPrice,
        totalDuration: bookingState.totalDuration,
        smsConsent: bookingState.smsConsent
    };
    
    // In a real application, this would be sent to your backend
    console.log('Booking submitted:', bookingData);
    
  // Add to Google Calendar via our API
  try {
    const response = await fetch('https://addevent-is52ejehnq-uc.a.run.app', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookingData)
    });

    const result = await response.json();
    
    if (result.success) {
      // Store the event ID for potential updates/cancellations later
      bookingState.googleCalendarEventId = result.eventId;
      console.log('Event added to Google Calendar with ID:', result.eventId);
    } else {
      console.error('Failed to add event to Google Calendar:', result.error);
    }
  } catch (error) {
    console.error('Error adding event to Google Calendar:', error);
  }
  
  // Mock successful booking - Add the time slot to booked slots
  if (!bookingState.bookedSlots[bookingState.date]) {
    bookingState.bookedSlots[bookingState.date] = [];
  }
  bookingState.bookedSlots[bookingState.date].push(bookingState.time);
  
  // Send confirmation emails and SMS
  sendConfirmations(bookingData);
  
  // Go to confirmation step
  goToStep('confirmation');
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
document.getElementById('reschedule-btn').addEventListener('click', function() {
    // Store old date and time for later reference (to free up the slot)
    const oldDate = bookingState.date;
    const oldTime = bookingState.time;
    
    // Save the original next button function
    const originalNextFunction = nextBtn.onclick;
    
    // Function for handling rescheduled appointment submission
    function handleRescheduleSubmit() {
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
            
            // Add the new booking slot
            if (!bookingState.bookedSlots[bookingState.date]) {
                bookingState.bookedSlots[bookingState.date] = [];
            }
            bookingState.bookedSlots[bookingState.date].push(bookingState.time);
            
            // Create booking data object for reschedule
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
            
            // Update Google Calendar event via Firebase Function
            async function updateCalendarEvent() {
                try {
                    // Call our new updateEvent function
                    const response = await fetch('https://updateevent-is52ejehnq-uc.a.run.app', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            eventId: bookingState.googleCalendarEventId,
                            bookingData: bookingData
                        })
                    });

                    const result = await response.json();
                    
                    if (result.success) {
                        console.log('Google Calendar event updated successfully via API');
                    } else {
                        console.error('Failed to update Google Calendar event via API:', result.error);
                    }
                } catch (error) {
                    console.error('Error updating Google Calendar event:', error);
                }
            }
            
            // Execute the update if we have an event ID
            if (bookingState.googleCalendarEventId) {
                updateCalendarEvent();
            } else {
                console.log('No Google Calendar event ID found, skipping update');
            }

            // Send reschedule notifications
            sendConfirmations(bookingData);
            goToStep('confirmation');
            
            // Restore original next button behavior
            nextBtn.onclick = originalNextFunction;
        }
    }
    
    // Reset to step 3 (date selection)
    bookingState.currentStep = 3;
    goToStep(3);
    
    // Show navigation buttons again
    prevBtn.style.display = 'block';
    nextBtn.style.display = 'block';
    nextBtn.textContent = 'Next';
    
    // Create a rescheduling flag
    bookingState.isRescheduling = true;
    
    // Add a temporary event listener that runs before the regular click handler
    nextBtn.addEventListener('click', function rescheduleCheck(e) {
        // If we're on step 6 and in rescheduling mode, handle differently
        if (bookingState.currentStep === 6 && bookingState.isRescheduling) {
            e.stopImmediatePropagation(); // Prevent other handlers from running
            handleRescheduleSubmit();
            
            // Remove this temporary handler after we're done
            nextBtn.removeEventListener('click', rescheduleCheck);
            bookingState.isRescheduling = false;
        }
    }, true); // Use capturing phase to run before other handlers
});
// Cancel button handler
document.getElementById('cancel-btn').addEventListener('click', function() {
    // Show custom confirmation dialog instead of browser's confirm()
    const customDialog = document.getElementById('custom-confirm-dialog');
    customDialog.style.display = 'block';
    
    // Handle "No" button click
    document.getElementById('custom-cancel-no').onclick = function() {
        customDialog.style.display = 'none';
    };
    
    // Handle "Yes" button click
    document.getElementById('custom-cancel-yes').onclick = function() {
        customDialog.style.display = 'none';
        
        // Remove the booking from booked slots
        const bookedSlotsForDate = bookingState.bookedSlots[bookingState.date] || [];
        const index = bookedSlotsForDate.indexOf(bookingState.time);
        if (index > -1) {
            bookedSlotsForDate.splice(index, 1);
        }
        
        // Delete event from Google Calendar via Firebase Function
        async function deleteCalendarEvent() {
            // Only proceed if we have an event ID
            if (!bookingState.googleCalendarEventId) {
                console.log('No Google Calendar event ID found, skipping deletion');
                return;
            }
            
            try {
                // Call our new deleteEvent function
                const response = await fetch('https://deleteevent-is52ejehnq-uc.a.run.app', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        eventId: bookingState.googleCalendarEventId
                    })
                });

                const result = await response.json();
                
                if (result.success) {
                    console.log('Google Calendar event deleted successfully via API');
                } else {
                    console.error('Failed to delete Google Calendar event via API:', result.error);
                }
            } catch (error) {
                console.error('Error deleting Google Calendar event:', error);
            }
        }
        
        // Execute the deletion if we have an event ID
        if (bookingState.googleCalendarEventId) {
            deleteCalendarEvent();
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
        
        // Show custom success message instead of alert()
        showCustomSuccessMessage('Your appointment has been cancelled.');
    };
});

// Add this new function at the end of your script.js file
function showCustomSuccessMessage(message) {
    // Create success notification element
    const successNotification = document.createElement('div');
    successNotification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #34c759;
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        text-align: center;
        font-weight: bold;
        min-width: 300px;
    `;
    successNotification.innerText = message;
    
    // Add to document
    document.body.appendChild(successNotification);
    
    // Remove after 3 seconds
    setTimeout(function() {
        document.body.removeChild(successNotification);
    }, 3000);
}
    // Initialize the booking form
    updateSummary();
    goToStep(1);
    
    // Make bookingState available globally (for the Google Calendar integration)
    window.bookingState = bookingState;
});
