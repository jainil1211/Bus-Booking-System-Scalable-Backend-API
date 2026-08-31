const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.EMAIL_FROM_ADDRESS || "onboarding@resend.dev";

/**
 * Sends a booking confirmation email
 * @param {Object} booking - Populated booking object
 * @param {Object} payment - Associated payment object
 * @returns {Promise<Object>} Resend response
 */
const sendConfirmationEmail = async (booking, payment) => {
  try {
    const user = booking.userId;
    const trip = booking.tripId;
    const bus = trip.busId;
    const route = trip.routeId;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #4CAF50;">Booking Confirmed!</h2>
        <p>Hi ${user.name},</p>
        <p>Your bus booking has been successfully confirmed. Here are your ticket details:</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Journey Details</h3>
          <p><strong>From:</strong> ${route.source}</p>
          <p><strong>To:</strong> ${route.destination}</p>
          <p><strong>Travel Date:</strong> ${new Date(trip.travelDate).toLocaleDateString()}</p>
          <p><strong>Departure:</strong> ${trip.departureTime}</p>
          <p><strong>Arrival:</strong> ${trip.arrivalTime}</p>
        </div>

        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Booking Details</h3>
          <p><strong>Booking ID:</strong> ${booking._id}</p>
          <p><strong>Status:</strong> ${booking.status}</p>
          <p><strong>Seat(s):</strong> ${booking.seatNumbers.join(", ")}</p>
          <p><strong>Total Amount:</strong> ₹${booking.totalAmount}</p>
        </div>

        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Bus Details</h3>
          <p><strong>Bus Operator:</strong> ${bus.operator}</p>
          <p><strong>Bus Number:</strong> ${bus.busNumber}</p>
          <p><strong>Type:</strong> ${bus.busType}</p>
        </div>

        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Payment Information</h3>
          <p><strong>Payment Status:</strong> ${payment.status}</p>
          <p><strong>Transaction ID:</strong> ${payment.razorpayPaymentId}</p>
        </div>

        <p>Have a safe journey!</p>
        <p>Best regards,<br>Bus Booking System Team</p>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: `Bus Booking System <${FROM_EMAIL}>`,
      to: [user.email],
      subject: `Booking Confirmed - Ticket #${booking._id}`,
      html: htmlContent,
    });

    if (error) {
      console.error("[Email Service] Failed to send confirmation email:", error);
      throw error;
    }

    console.log("[Email Service] Confirmation email sent successfully:", data);
    return data;
  } catch (error) {
    console.error("[Email Service] Unexpected error sending confirmation email:", error);
    throw error;
  }
};

/**
 * Sends a booking cancellation email
 * @param {Object} booking - Populated booking object
 * @returns {Promise<Object>} Resend response
 */
const sendCancellationEmail = async (booking) => {
  try {
    const user = booking.userId;
    const trip = booking.tripId;
    const bus = trip.busId;
    const route = trip.routeId;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #F44336;">Booking Cancelled</h2>
        <p>Hi ${user.name},</p>
        <p>Your bus booking has been cancelled as per your request.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Cancelled Journey Details</h3>
          <p><strong>Booking ID:</strong> ${booking._id}</p>
          <p><strong>From:</strong> ${route.source}</p>
          <p><strong>To:</strong> ${route.destination}</p>
          <p><strong>Travel Date:</strong> ${new Date(trip.travelDate).toLocaleDateString()}</p>
          <p><strong>Seat(s):</strong> ${booking.seatNumbers.join(", ")}</p>
          <p><strong>Bus Operator:</strong> ${bus.operator}</p>
          <p><strong>Cancellation Time:</strong> ${new Date(booking.cancelledAt).toLocaleString()}</p>
        </div>

        <p>If you have any questions about refunds, please contact our support team.</p>
        <p>Best regards,<br>Bus Booking System Team</p>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: `Bus Booking System <${FROM_EMAIL}>`,
      to: [user.email],
      subject: `Booking Cancelled - Ticket #${booking._id}`,
      html: htmlContent,
    });

    if (error) {
      console.error("[Email Service] Failed to send cancellation email:", error);
      throw error;
    }

    console.log("[Email Service] Cancellation email sent successfully:", data);
    return data;
  } catch (error) {
    console.error("[Email Service] Unexpected error sending cancellation email:", error);
    throw error;
  }
};

module.exports = {
  sendConfirmationEmail,
  sendCancellationEmail,
};
