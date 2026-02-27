/**
 * Telegram Mini App SDK Service
 */
export const tmaService = {
    get tg() {
        return window.Telegram?.WebApp;
    },

    get user() {
        return this.tg?.initDataUnsafe?.user || { id: 777777, username: 'demo_user', first_name: 'Alex' };
    },

    expand() {
        this.tg?.expand();
    },

    ready() {
        this.tg?.ready();
    },

    close() {
        this.tg?.close();
    },

    setHeaderColor(color) {
        this.tg?.setHeaderColor(color);
    },

    openInvoice(url, callback) {
        if (this.tg?.openInvoice) {
            this.tg.openInvoice(url, callback);
        } else {
            console.warn('Telegram.WebApp.openInvoice is not available');
            // Mock success for development if not in TG
            if (callback) callback('paid');
        }
    }
};
