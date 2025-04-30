<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta http-equiv="Content-Style-Type" content="text/css">
  <title></title>
  <meta name="Generator" content="Cocoa HTML Writer">
  <meta name="CocoaVersion" content="2575.4">
  <style type="text/css">
    p.p1 {margin: 0.0px 0.0px 0.0px 0.0px; font: 12.0px Helvetica}
    p.p2 {margin: 0.0px 0.0px 0.0px 0.0px; font: 12.0px Helvetica; min-height: 14.0px}
  </style>
</head>
<body>
<p class="p1">document.addEventListener('DOMContentLoaded', function() {</p>
<p class="p1"><span class="Apple-converted-space">    </span>// State management</p>
<p class="p1"><span class="Apple-converted-space">    </span>const bookingState = {</p>
<p class="p1"><span class="Apple-converted-space">        </span>currentStep: 1,</p>
<p class="p1"><span class="Apple-converted-space">        </span>service: null,</p>
<p class="p1"><span class="Apple-converted-space">        </span>barber: null,</p>
<p class="p1"><span class="Apple-converted-space">        </span>date: null,</p>
<p class="p1"><span class="Apple-converted-space">        </span>time: null,</p>
<p class="p1"><span class="Apple-converted-space">        </span>addons: [],</p>
<p class="p1"><span class="Apple-converted-space">        </span>customerInfo: {</p>
<p class="p1"><span class="Apple-converted-space">            </span>firstName: '',</p>
<p class="p1"><span class="Apple-converted-space">            </span>lastName: '',</p>
<p class="p1"><span class="Apple-converted-space">            </span>email: '',</p>
<p class="p1"><span class="Apple-converted-space">            </span>phone: ''</p>
<p class="p1"><span class="Apple-converted-space">        </span>},</p>
<p class="p1"><span class="Apple-converted-space">        </span>totalPrice: 0,</p>
<p class="p1"><span class="Apple-converted-space">        </span>totalDuration: 0,</p>
<p class="p1"><span class="Apple-converted-space">        </span>bookedSlots: {}, // Format: "YYYY-MM-DD": ["10:00", "14:30"]</p>
<p class="p1"><span class="Apple-converted-space">        </span>appointmentId: null</p>
<p class="p1"><span class="Apple-converted-space">    </span>};</p>
<p class="p2"><span class="Apple-converted-space">    </span></p>
<p class="p1"><span class="Apple-converted-space">    </span>// Mock data for already booked slots</p>
<p class="p1"><span class="Apple-converted-space">    </span>// In production, this would come from your backend/database</p>
<p class="p1"><span class="Apple-converted-space">    </span>const mockBookedSlots = {</p>
<p class="p1"><span class="Apple-converted-space">        </span>"2025-04-29": ["10:00", "14:30"],</p>
<p class="p1"><span class="Apple-converted-space">        </span>"2025-04-30": ["09:00", "11:30", "15:00"],</p>
<p class="p1"><span class="Apple-converted-space">        </span>"2025-05-01": ["13:00", "16:30"],</p>
<p class="p1"><span class="Apple-converted-space">    </span>};</p>
<p class="p2"><span class="Apple-converted-space">    </span></p>
<p class="p1"><span class="Apple-converted-space">    </span>// Initialize with mock data</p>
<p class="p1"><span class="Apple-converted-space">    </span>bookingState.bookedSlots = mockBookedSlots;</p>
<p class="p2"><span class="Apple-converted-space">    </span></p>
<p class="p1"><span class="Apple-converted-space">    </span>// DOM Elements</p>
<p class="p1"><span class="Apple-converted-space">    </span>const steps = document.querySelectorAll('.booking-step');</p>
<p class="p1"><span class="Apple-converted-space">    </span>const stepContents = document.querySelectorAll('.step-content');</p>
<p class="p1"><span class="Apple-converted-space">    </span>const prevBtn = document.getElementById('prev-btn');</p>
<p class="p1"><span class="Apple-converted-space">    </span>const nextBtn = document.getElementById('next-btn');</p>
<p class="p2"><span class="Apple-converted-space">    </span></p>
<p class="p1"><span class="Apple-converted-space">    </span>// Initialize phone input with country flags</p>
<p class="p1"><span class="Apple-converted-space">    </span>const phoneInput = window.intlTelInput(document.getElementById('phone'), {</p>
<p class="p1"><span class="Apple-converted-space">        </span>initialCountry: "in",</p>
<p class="p1"><span class="Apple-converted-space">        </span>separateDialCode: true,</p>
<p class="p1"><span class="Apple-converted-space">        </span>utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/18.1.5/js/utils.js"</p>
<p class="p1"><span class="Apple-converted-space">    </span>});</p>
</body>
</html>
