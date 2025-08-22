import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

export function formatTime(timestamp: number) {
    return dayjs(timestamp).utc().format("YYYY-MM-DDTHH:mm:ssZ");
}