const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = 3000;

const MIDTRANS_API =
    "https://api.sandbox.midtrans.com";

const SERVER_KEY =
    process.env.MIDTRANS_SERVER_KEY;


// ===============================
// CREATE QRIS
// ===============================

app.post("/api/qris/create", async (req, res) => {

    try {

        const { amount, items } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                message: "Nominal tidak valid."
            });
        }

        const orderId =
            "PASAR-" + Date.now();


        const itemDetails = items.map(item => ({
            id: String(item.id),
            price: Number(item.price),
            quantity: Number(item.quantity),
            name: String(item.name).substring(0, 50)
        }));


        const auth = Buffer
            .from(SERVER_KEY + ":")
            .toString("base64");


        const response = await fetch(
            `${MIDTRANS_API}/v2/charge`,
            {
                method: "POST",

                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": `Basic ${auth}`
                },

                body: JSON.stringify({

                    payment_type: "qris",

                    transaction_details: {
                        order_id: orderId,
                        gross_amount: Number(amount)
                    },

                    item_details: itemDetails,

                    qris: {
                        acquirer: "gopay"
                    }

                })
            }
        );


        const data = await response.json();


        if (!response.ok) {

            console.error(data);

            return res.status(response.status).json({
                message:
                    data.status_message ||
                    "Gagal membuat QRIS"
            });
        }


        // Cari URL QRIS
        const qrAction =
            data.actions?.find(
                action =>
                    action.name ===
                    "generate-qr-code"
            );


        if (!qrAction) {

            return res.status(500).json({
                message:
                    "QRIS URL tidak ditemukan."
            });
        }


        res.json({

            success: true,

            order_id:
                data.order_id,

            transaction_id:
                data.transaction_id,

            gross_amount:
                Number(data.gross_amount),

            qr_url:
                qrAction.url

        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            message:
                "Backend error",
            error:
                error.message
        });

    }

});


// ===============================
// CHECK STATUS
// ===============================

app.get(
    "/api/qris/status/:orderId",
    async (req, res) => {

        try {

            const orderId =
                req.params.orderId;


            const auth = Buffer
                .from(SERVER_KEY + ":")
                .toString("base64");


            const response = await fetch(
                `${MIDTRANS_API}/v2/${orderId}/status`,
                {
                    headers: {
                        "Accept":
                            "application/json",

                        "Authorization":
                            `Basic ${auth}`
                    }
                }
            );


            const data =
                await response.json();


            res.json({

                order_id:
                    data.order_id,

                transaction_status:
                    data.transaction_status,

                gross_amount:
                    data.gross_amount

            });


        } catch (error) {

            res.status(500).json({
                message:
                    error.message
            });

        }

    }
);


app.listen(
    PORT,
    () => {
        console.log(
            `PASAR+ backend aktif di http://localhost:${PORT}`
        );
    }
);
