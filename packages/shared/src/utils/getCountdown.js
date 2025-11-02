export function getCountdown(targetDate) {
    const now = new Date();
    const eventDate = new Date(targetDate);
    const diff = eventDate.getTime() - now.getTime();
    if (diff <= 0)
        return "Event passed!";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 31) {
        const months = Math.floor(days / 30);
        const remainingDays = days % 30;
        return `${months} month${months > 1 ? "s" : ""}, ${remainingDays} day${remainingDays !== 1 ? "s" : ""} left`;
    }
    else {
        return `${days} day${days !== 1 ? "s" : ""} left`;
    }
}
export function daysUntil(targetDate) {
    const now = new Date();
    const eventDate = new Date(targetDate);
    const diff = eventDate.getTime() - now.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}
// Export a function that returns countdown object for the store
export const getCountdownObject = (targetDate) => {
    const now = new Date();
    const target = new Date(targetDate);
    const diff = target.getTime() - now.getTime();
    const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    return { days, months, remainingDays };
};
