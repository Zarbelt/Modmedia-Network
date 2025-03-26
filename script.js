document.addEventListener('DOMContentLoaded', () => {
    // Constants
    const SNOWDN_PER_KAS = 0.20975; // Fixed rate: 1 SNOWDN = 0.20975 KAS
    const CACHE_DURATION = 900000; // 15 minutes in milliseconds (900 seconds)
    const MAX_ATTEMPTS = 5;

    // Function to get SNOWDN price
    async function getSnowdnPrice() {
        console.log('getSnowdnPrice function started');
        const now = new Date().getTime();

        // Check local storage cache first
        const cachedPrice = localStorage.getItem('snowdn_price');
        if (cachedPrice) {
            const [usdPrice, kasPrice, timestamp] = cachedPrice.split('|');
            const ageInSeconds = (now - parseInt(timestamp)) / 1000;
            if (ageInSeconds < 900) { // Use cache if less than 15 minutes old
                console.log(`Using cached SNOWDN price: $${usdPrice} (Age: ${ageInSeconds.toFixed(2)}s)`);
                return {
                    snowdnPriceUSD: parseFloat(usdPrice),
                    kaspaPrice: parseFloat(kasPrice)
                };
            } else {
                console.log(`Cache expired (Age: ${ageInSeconds.toFixed(2)}s), fetching fresh price`);
            }
        } else {
            console.log('No cached price found, fetching fresh price');
        }

        // Fetch Kaspa price from CoinGecko
        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            try {
                const url = 'https://api.coingecko.com/api/v3/simple/price?ids=kaspa&vs_currencies=usd';
                console.log(`Attempt ${attempt + 1}: Fetching from ${url}`);
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'SNOWDN-Price-Tracker/1.0'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                if (!data.kaspa || typeof data.kaspa.usd !== 'number') {
                    throw new Error('Invalid Kaspa USD price data');
                }

                const kasPriceUSD = data.kaspa.usd;
                const snowdnPriceUSD = kasPriceUSD * SNOWDN_PER_KAS;

                const priceData = `${snowdnPriceUSD.toFixed(4)}|${kasPriceUSD.toFixed(6)}|${now}`;
                localStorage.setItem('snowdn_price', priceData); // Cache in local storage
                console.log(`SNOWDN price calculated: $${snowdnPriceUSD.toFixed(4)}`);
                return {
                    snowdnPriceUSD: snowdnPriceUSD,
                    kaspaPrice: kasPriceUSD
                };
            } catch (error) {
                console.error(`Error on attempt ${attempt + 1}: ${error.message}`);
                if (attempt < MAX_ATTEMPTS - 1) {
                    const delay = 2000 * (attempt + 1);
                    console.log(`Waiting ${delay}ms before retry`);
                    await new Promise(resolve => setTimeout(resolve, delay)); // Backoff: 2s, 4s, 6s, 8s, 10s
                }
            }
        }

        console.log('All attempts failed, using fallback');
        return {
            snowdnPriceUSD: 0.0335,
            kaspaPrice: 0.15975
        };
    }

    // Function to update the prices on the page
    async function updatePrices() {
        const priceData = await getSnowdnPrice();

        // Update top section
        const snowdnPriceElement = document.getElementById('snowdn-price');
        const kaspaPriceElement = document.getElementById('kaspa-price');
        if (snowdnPriceElement && kaspaPriceElement) {
            snowdnPriceElement.textContent = `$${priceData.snowdnPriceUSD.toFixed(4)}`;
            kaspaPriceElement.textContent = `$${priceData.kaspaPrice.toFixed(6)}`;
        }

        // Update $Snowdn Swap DeFi Tool card
        const snowdnPriceSwapElement = document.getElementById('snowdn-price-swap');
        const kaspaPriceSwapElement = document.getElementById('kaspa-price-swap');
        if (snowdnPriceSwapElement && kaspaPriceSwapElement) {
            snowdnPriceSwapElement.textContent = `$${priceData.snowdnPriceUSD.toFixed(4)}`;
            kaspaPriceSwapElement.textContent = `$${priceData.kaspaPrice.toFixed(6)}`;
        }
    }

    // Fetch and update prices on page load
    updatePrices();

    // Update prices every 15 minutes (900000 milliseconds)
    setInterval(updatePrices, 900000);
});