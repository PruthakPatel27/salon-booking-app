/**
 * booking-events.js
 * 
 * This file adds event dispatchers to the existing booking functionality
 * without modifying the original code
 */

(function() {
    // Add event dispatchers to the existing booking system
    document.addEventListener('DOMContentLoaded', function() {
        setupDateSelectionEvent();
        setupBookingEvent();
        setupRescheduleEvent();
        setupCancelEvent();
        setupTimeSlotGenerationEvent();
    });
    
    // Set up date selection event
    function setupDateSelectionEvent() {
        // Get the date picker element
        const datePicker = document.getElementById('date-picker');
        if (!datePicker) return;
        
        // Create a mutation observer to watch for date changes
        const dateObserver = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
                    const date = datePicker.value;
                    if (date) {
                        // Dispatch date selected event
                        document.dispatchEvent(new CustomEvent('dateSelected', {
                            detail: { date: date }
                        }));
                    }
                }
            });
        });
        
        // Start observing
        dateObserver.observe(datePicker, { attributes: true });
        
        // Also hook into the flatpickr onChange event if using flatpickr
        if (window.flatpickr && datePicker._flatpickr) {
            const originalOnChange = datePicker._flatpickr.config.onChange;
            
            datePicker._flatpickr.config.onChange = function(selectedDates, dateStr) {
                if (originalOnChange) {
                    originalOnChange(selectedDates, dateStr);
                }
                
                document.dispatchEvent(new CustomEvent('dateSelected', {
                    detail: { date: dateStr }
                }));
            };
        }
    }
    
    // Set up booking event
    function setupBookingEvent() {
        // Monitor for form submission in the booking step
        const nextBtn = document.getElementById('next-btn');
        if (!nextBtn) return;
        
        // Create a wrapper for the original click handler
        const originalOnClick = nextBtn.onclick;
        
        nextBtn.onclick = function(event) {
            // Call the original handler first
            if (originalOnClick) {
                originalOnClick.call(this, event);
            }
            
            // Check if this is the final step (Step 6 - Customer Info)
            if (window.bookingState && window.bookingState.currentStep === 6) {
                // Check if form is valid
                if (isFormValid()) {
                    // Booking is being confirmed, dispatch event
                    setTimeout(function() {
                        document.dispatchEvent(new CustomEvent('appointmentBooked', {
                            detail: { 
                                bookingData: getBookingData(),
                                appointmentId: window.bookingState.appointmentId
                            }
                        }));
                    }, 500); // Small delay to ensure bookingState is updated
                }
            }
        };
    }
    
    // Set up reschedule event
    function setupRescheduleEvent() {
        const rescheduleBtn = document.getElementById('reschedule-btn');
        if (!rescheduleBtn) return;
        
        // Save the original click handler
        const originalOnClick = rescheduleBtn.onclick;
        
        // Add our event dispatcher
        rescheduleBtn.addEventListener('click', function() {
            // Store old appointment details
            const oldDate = window.bookingState.date;
            const oldTime = window.bookingState.time;
            const appointmentId = window.bookingState.appointmentId;
            
            // Get event ID from local storage
            const appointmentData = getAppointmentData(appointmentId);
            const eventId = appointmentData ? appointmentData.eventId : null;
            
            // Set a flag to identify when rescheduling is complete
            window.isRescheduling = true;
            window.oldAppointmentDetails = {
                date: oldDate,
                time: oldTime,
                eventId: eventId
            };
            
            // Call original handler
            if (originalOnClick) {
                originalOnClick.call(this);
            }
        });
        
        // Monitor form submission during rescheduling
        monitorRescheduleCompletion();
    }
    
    // Monitor the booking process to detect when rescheduling is complete
    function monitorRescheduleCompletion() {
        // We need to hook into the moment when the rescheduled booking is confirmed
        document.addEventListener('click', function(event) {
            // Check if we're in rescheduling mode and this is the final confirmation
            if (window.isRescheduling && 
                window.bookingState && 
                window.bookingState.currentStep === 6 && 
                event.target && 
                event.target.id === 'next-btn') {
                
                // Rescheduling is being confirmed, dispatch event after a short delay
                setTimeout(function() {
                    if (window.oldAppointmentDetails && window.oldAppointmentDetails.eventId) {
                        document.dispatchEvent(new CustomEvent('appointmentRescheduled', {
                            detail: { 
                                bookingData: getBookingData(),
                                eventId: window.oldAppointmentDetails.eventId,
                                oldDate: window.oldAppointmentDetails.date,
                                oldTime: window.oldAppointmentDetails.time
                            }
                        }));
                    }
                    
                    // Reset rescheduling flag
                    window.isRescheduling = false;
                    window.oldAppointmentDetails = null;
                }, 500);
            }
        });
    }
    
    // Set up cancel event
    function setupCancelEvent() {
        const cancelBtn = document.getElementById('cancel-btn');
        if (!cancelBtn) return;
        
        // Save the original click handler
        const originalOnClick = cancelBtn.onclick;
        
        // Get the yes button in the cancel confirmation dialog
        const confirmCancelBtn = document.getElementById('custom-cancel-yes');
        if (!confirmCancelBtn) return;
        
        // Save the original click handler
        const originalConfirmOnClick = confirmCancelBtn.onclick;
        
        // Add our event dispatcher to the confirmation button
        confirmCancelBtn.onclick = function() {
            const appointmentId = window.bookingState.appointmentId;
            const appointmentData = getAppointmentData(appointmentId);
            const eventId = appointmentData ? appointmentData.eventId : null;
            
            // Dispatch cancel event before the original handler executes
            if (eventId) {
                document.dispatchEvent(new CustomEvent('appointmentCanceled', {
                    detail: { 
                        eventId: eventId,
                        appointmentId: appointmentId
                    }
                }));
            }
            
            // Call original handler
            if (originalConfirmOnClick) {
                originalConfirmOnClick.call(this);
            }
        };
        
        // Keep the original cancel button click handler
        cancelBtn.onclick = function() {
            if (originalOnClick) {
                originalOnClick.call(this);
            }
        };
    }
    
    // Set up event for time slot generation
    function setupTimeSlotGenerationEvent() {
        // Listen for regenerate event and call the original function
        document.addEventListener('regenerateTimeSlots', function(e) {
            if (e.detail && e.detail.date && typeof window.generateTimeSlots === 'function') {
                window.generateTimeSlots(e.detail.date);
            }
        });
    }
    
    // Helper function to check if form is valid
    function isFormValid() {
        // Basic validation check
        const firstName = document.getElementById('first-name').value;
        const lastName = document.getElementById('last-name').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        
        return firstName && lastName && email && phone;
    }
    
    // Get current booking data
    function getBookingData() {
        if (!window.bookingState) return null;
        
        return {
            appointmentId: window.bookingState.appointmentId,
            service: window.bookingState.service,
            barber: window.bookingState.barber,
            date: window.bookingState.date,
            time: window.bookingState.time,
            addons: window.bookingState.addons,
            customerInfo: window.bookingState.customerInfo,
            totalPrice: window.bookingState.totalPrice,
            totalDuration: window.bookingState.totalDuration,
            smsConsent: window.bookingState.smsConsent
        };
    }
    
    // Helper function to get appointment data
    function getAppointmentData(appointmentId) {
        if (!appointmentId) return null;
        
        try {
            const appointments = JSON.parse(localStorage.getItem('salonAppointments') || '{}');
            return appointments[appointmentId];
        } catch (error) {
            console.error('Error retrieving appointment data:', error);
            return null;
        }
    }
})();
