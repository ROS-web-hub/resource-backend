// This method converts the request object to calendar readable event object
const getEvents = (requests, resources) => {
  const events = [];
  const EVENT_COLOR = {
    approved: "#1F9653",
    pending: "#01246E",
    rejected: "#A90000",
    schedule: "#e26d5c",
  };

  for (let request of requests) {
    const event = {
      _id: request._id,
      id: request.id,
      start: request.startDateTime,
      end: request.endDateTime,
      resourceId: request.resourceId?._id || request.controlRoom?._id,
      display: "auto",
      title: request.name,
      color: EVENT_COLOR[request.status?.toLowerCase()],
      extendedProps: {
        request: request, // for simplicity we take all the data of the request to the front.
      },
    };

    events.push(event);

    if (request.requestType == "prerecorded" || request.requestType == "live") {
      // Create event entries for the participants as well
      if (request?.participants?.length > 0)
        for (let i = 0; i < request.participants.length; i++) {
          if (
            resources.includes(request.participants[i].studio.toHexString())
          ) {
            let exist = false;
            for (let j = 0; j < events.length; j++) {
              if (
                events[j].resourceId ==
                  request.participants[i].studio.toHexString() &&
                events[j].start == request.startDateTime &&
                events[j].end == request.endDateTime
              ) {
                exist = true;
                break;
              }
            }

            if (!exist) {
              const mRequest = JSON.parse(JSON.stringify(request));
              // Put only the participants from this specific studio
              mRequest.participants = getParticipantsForResource(
                mRequest.participants,
                request.participants[i].studio
              );
              const newStatus = request.approvals.find(
                (item) =>
                  item.resource.id.toHexString() ==
                  request.participants[i].studio.toHexString()
              )?.status;

              const event = {
                _id: request._id,
                start: request.startDateTime,
                end: request.endDateTime,
                resourceId: request.participants[i].studio,
                display: "auto",
                title: request.name,
                color: EVENT_COLOR[(newStatus ?? request.status).toLowerCase()],
                extendedProps: {
                  request: { ...mRequest, status: newStatus ?? request.status }, // for simplicity we take all the data of the request to the front.
                },
              };
              events.push(event);
            }
          }
        }
    }
  }

  return events;
};

function getParticipantsForResource(participants, resourceId) {
  const p = [];
  for (let i = 0; i < participants.length; i++) {
    if (participants[i].studio == resourceId) {
      p.push(participants[i]);
    }
  }

  return p;
}

// This method converts the request object to calendar readable event object
const getScheduleEvents = (schedules) => {
  const events = [];
  const EVENT_COLOR = {
    approved: "#1F9653",
    pending: "#01246E",
    rejected: "#A90000",
    schedule: "#e26d5c",
    schedule_complete: "#1F9653",
  };

  for (let schedule of schedules) {
    const s = JSON.parse(JSON.stringify(schedule));
    s["requestType"] = "schedule";
    const event = {
      _id: schedule._id,
      start: schedule.startDateTime,
      end: schedule.endDateTime,
      resourceId: schedule.resourceId?._id,
      display: "auto",
      title: schedule.details,
      color:
        EVENT_COLOR[s.status == "Complete" ? "schedule_complete" : "schedule"],
      extendedProps: {
        request: s, // for simplicity we take all the data of the request to the front.
      },
    };

    events.push(event);
  }

  return events;
};

module.exports = { getEvents, getScheduleEvents };
