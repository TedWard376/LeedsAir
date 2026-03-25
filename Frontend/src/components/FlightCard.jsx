import { stopsLabel } from "../Utils.js";

export function FlightCard({ flight, onSelect }) {
  const stops = stopsLabel(flight.stops);

  return (
    <div className="flight-card">
      <div className="flight-card-airline">
        <span className="airline-name">{flight.airline}</span>
        <span className="flight-number">{flight.flightNumber}</span>
      </div>

      <div className="flight-card-times">
        <div className="time-block">
          <span className="time">{flight.departureTime}</span>
          <span className="airport">{flight.from}</span>
        </div>
        <div className="duration-block">
          <span className="duration">{flight.duration}</span>
          <div className="flight-line">
            <span className="dot" />
            <div className="line" />
            <span className="dot" />
          </div>
          <span className="stops-label">{stops}</span>
        </div>
        <div className="time-block">
          <span className="time">{flight.arrivalTime}</span>
          <span className="airport">{flight.to}</span>
        </div>
      </div>

      <div className="flight-card-price">
        <span className="price-from">from</span>
        <span className="price">£{flight.price}</span>
        <button className="select-btn" onClick={() => onSelect(flight)}>
          Select
        </button>
      </div>
    </div>
  );
}