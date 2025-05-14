// Reschedule button handler
document.getElementById('reschedule-btn').addEventListener('click', function() {
    // Store old date and time for later reference (to free up the slot)
    const oldDate = bookingState.date;
    const oldTime = bookingState.time;
    
    // Try to get event ID from bookingState, fall back to localStorage if needed
    let eventId = bookingState.googleCalendarEventId;
    if (!eventId && bookingState.appointmentId) {
        eventId = checkStoredEventId(bookingState.appointmentId);
        if (eventId) {
            bookingState.googleCalendarEventId = eventId; // Update the booking state
        }
    }
    
    console.log('Starting reschedule process with event ID:', eventId);
    console.log('Original date/time:', oldDate, oldTime);
    
    // Save the original next button function
    const originalNextFunction = nextBtn.onclick;
    
    // Function for handling rescheduled appointment submission
    async function handleRescheduleSubmit() {
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
            
            // Prepare booking data for updates
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
            
            console.log('Rescheduling to new date/time:', bookingState.date, bookingState.time);
            
            // Update Google Calendar event
            if (eventId) {
                console.log('Attempting to update calendar event with ID:', eventId);
                try {
                    const updated = await window.googleCalendarIntegration.updateEventInGoogleCalendar(eventId, bookingData);
                    console.log('Calendar update result:', updated);
                    if (updated) {
                        console.log('Google Calendar event updated successfully');
                        
                        // Update localStorage
                        saveBookingToLocalStorage(bookingState.appointmentId, bookingData, eventId);
                    } else {
                        console.error('Calendar update returned false');
                    }
                } catch (error) {
                    console.error('Failed to update Google Calendar event:', error);
                }
            } else {
                console.warn('No event ID found for rescheduling');
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
    document.getElementById('custom-cancel-yes').onclick = async function() {
        customDialog.style.display = 'none';
        
        // Try to get event ID from bookingState, fall back to localStorage if needed
        let eventId = bookingState.googleCalendarEventId;
        if (!eventId && bookingState.appointmentId) {
            eventId = checkStoredEventId(bookingState.appointmentId);
        }
        
        console.log('Attempting to cancel appointment with event ID:', eventId);
        
        // Delete from Google Calendar if we have an event ID
        if (eventId) {
            try {
                const deleted = await window.googleCalendarIntegration.deleteEventFromGoogleCalendar(eventId);
                if (deleted) {
                    console.log('Event successfully deleted from Google Calendar');
                    
                    // Remove from localStorage
                    const existingBookings = JSON.parse(localStorage.getItem('salonBookings')) || {};
                    if (existingBookings[bookingState.appointmentId]) {
                        delete existingBookings[bookingState.appointmentId];
                        localStorage.setItem('salonBookings', JSON.stringify(existingBookings));
                        console.log('Booking removed from localStorage');
                    }
                } else {
                    console.error('Failed to delete event from Google Calendar');
                }
            } catch (error) {
                console.error('Error deleting event from Google Calendar:', error);
            }
        } else {
            console.warn('No event ID found for cancellation');
        }
        
        // Remove the booking from booked slots
        const bookedSlotsForDate = bookingState.bookedSlots[bookingState.date] || [];
        const index = bookedSlotsForDate.indexOf(bookingState.time);
        if (index > -1) {
            bookedSlotsForDate.splice(index, 1);
            console.log(`Removed booking slot: ${bookingState.date} at ${bookingState.time}`);
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
        
        // Show custom success message
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
