import { Inngest } from "inngest";
import User from "../models/User.js";
import Connection from "../models/Connection.js";
import sendEmail from "../configs/nodeMailer.js";
import Story from "../models/Story.js";
import Message from "../models/Message.js";
import connectDB from "../configs/db.js";

// Create an Inngest client
export const inngest = new Inngest({
  id: "hangout-app",
});

// Save newly created Clerk user in MongoDB
const syncUserCreation = inngest.createFunction(
  {
    id: "sync-user-from-clerk",
    triggers: [{ event: "clerk/user.created" }],
  },
  async ({ event }) => {
    await connectDB();
    const {
      id,
      first_name,
      last_name,
      email_addresses,
      image_url,
    } = event.data;

    const email = email_addresses?.[0]?.email_address;

    if (!id || !email) {
      throw new Error("User ID and email are required");
    }

    let username = email.split("@")[0];

    const existingUser = await User.findOne({ username });

    if (existingUser) {
      username = `${username}${Math.floor(Math.random() * 10000)}`;
    }

    const userData = {
      _id: id,
      email,
      full_name: `${first_name || ""} ${last_name || ""}`.trim(),
      profile_picture: image_url || "",
      username,
    };

    await User.findByIdAndUpdate(
      id,
      { $setOnInsert: userData },
      { upsert: true, new: true, runValidators: true }
    );

    return {
      success: true,
      userId: id,
    };
  }
);

// Update Clerk user in MongoDB
const syncUserUpdation = inngest.createFunction(
  {
    id: "update-user-from-clerk",
    triggers: [{ event: "clerk/user.updated" }],
  },
  async ({ event }) => {
    await connectDB();
    const {
      id,
      first_name,
      last_name,
      email_addresses,
      image_url,
    } = event.data;

    const email = email_addresses?.[0]?.email_address;

    if (!id) {
      throw new Error("User ID is required");
    }

    const updatedUserData = {
      email: email || "",
      full_name: `${first_name || ""} ${last_name || ""}`.trim(),
      profile_picture: image_url || "",
    };

    await User.findByIdAndUpdate(id, updatedUserData, {
      new: true,
      runValidators: true,
    });

    return {
      success: true,
      userId: id,
    };
  }
);

// Delete Clerk user from MongoDB
const syncUserDeletion = inngest.createFunction(
  {
    id: "delete-user-with-clerk",
    triggers: [{ event: "clerk/user.deleted" }],
  },
  async ({ event }) => {
    await connectDB();
    const { id } = event.data;

    if (!id) {
      throw new Error("User ID is required");
    }

    await User.findByIdAndDelete(id);

    return {
      success: true,
      userId: id,
    };
  }
);

// Send connection request email and a reminder after 24 hours
const sendNewConnectionRequestReminder = inngest.createFunction(
  {
    id: "send-new-connection-request-reminder",
    triggers: [{ event: "app/connection-request" }],
  },
  async ({ event, step }) => {
    await connectDB();
    const { connectionId } = event.data;

    if (!connectionId) {
      throw new Error("connectionId is required");
    }

    await step.run("send-connection-request-mail", async () => {
      const connection = await Connection.findById(connectionId).populate(
        "from_user_id to_user_id"
      );

      if (!connection) {
        throw new Error("Connection request not found");
      }

      if (!connection.from_user_id || !connection.to_user_id) {
        throw new Error("Connection users could not be populated");
      }

      const subject = "👋 New Connection Request";

      const body = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Hi ${connection.to_user_id.full_name},</h2>

          <p>
            You have a new connection request from
            ${connection.from_user_id.full_name}
            (@${connection.from_user_id.username}).
          </p>

          <p>
            Click
            <a
              href="${process.env.FRONTEND_URL}/connections"
              style="color: #10b981;"
            >
              here
            </a>
            to accept or reject the request.
          </p>

          <br />

          <p>
            Thanks,<br />
            HangOut - Stay Connected
          </p>
        </div>
      `;

      await sendEmail({
        to: connection.to_user_id.email,
        subject,
        body,
      });

      return {
        message: "Connection request email sent",
      };
    });

    await step.sleep("wait-for-24-hours", "24h");

    return await step.run(
      "send-connection-request-reminder",
      async () => {
        const connection = await Connection.findById(connectionId).populate(
          "from_user_id to_user_id"
        );

        if (!connection) {
          return {
            message: "Connection request no longer exists",
          };
        }

        if (connection.status === "accepted") {
          return {
            message: "Connection request already accepted",
          };
        }

        if (connection.status === "rejected") {
          return {
            message: "Connection request was rejected",
          };
        }

        if (!connection.from_user_id || !connection.to_user_id) {
          throw new Error("Connection users could not be populated");
        }

        const subject = "👋 Reminder: New Connection Request";

        const body = `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Hi ${connection.to_user_id.full_name},</h2>

            <p>
              You still have a connection request from
              ${connection.from_user_id.full_name}
              (@${connection.from_user_id.username}).
            </p>

            <p>
              Click
              <a
                href="${process.env.FRONTEND_URL}/connections"
                style="color: #10b981;"
              >
                here
              </a>
              to accept or reject the request.
            </p>

            <br />

            <p>
              Thanks,<br />
              HangOut - Stay Connected
            </p>
          </div>
        `;

        await sendEmail({
          to: connection.to_user_id.email,
          subject,
          body,
        });

        return {
          message: "Connection reminder sent",
        };
      }
    );
  }
);

// Delete a story after 24 hours
const deleteStory = inngest.createFunction(
  {
    id: "story-delete",
    triggers: [{ event: "app/story.delete" }],
  },
  async ({ event, step }) => {
    await connectDB();
    const { storyId } = event.data;

    if (!storyId) {
      throw new Error("storyId is required");
    }

    await step.sleep("wait-for-story-expiration", "24h");

    return await step.run("delete-story", async () => {
      const deletedStory = await Story.findByIdAndDelete(storyId);

      if (!deletedStory) {
        return {
          message: "Story was already deleted or not found",
        };
      }

      return {
        message: "Story deleted successfully",
        storyId,
      };
    });
  }
);

// Send daily notifications for unseen messages
const sendNotificationOfUnseenMessages = inngest.createFunction(
  {
    id: "send-unseen-messages-notification",
    triggers: [{ cron: "TZ=America/New_York 0 9 * * *" }],
  },
  async ({ step }) => {
    await connectDB();
    const messages = await step.run(
      "find-unseen-messages",
      async () => {
        return Message.find({
          seen: false,
        }).populate("to_user_id");
      }
    );

    const unseenCount = {};

    for (const message of messages) {
      const recipient = message.to_user_id;

      if (!recipient?._id) {
        continue;
      }

      const userId = recipient._id.toString();

      unseenCount[userId] = (unseenCount[userId] || 0) + 1;
    }

    for (const [userId, count] of Object.entries(unseenCount)) {
      await step.run(
        `send-unseen-message-email-${userId}`,
        async () => {
          const user = await User.findById(userId);

          if (!user?.email) {
            return {
              message: `User ${userId} was not found`,
            };
          }

          const subject = `You have ${count} unseen message${
            count === 1 ? "" : "s"
          }`;

          const body = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>Hi ${user.full_name},</h2>

              <p>
                You have ${count} unseen message${count === 1 ? "" : "s"}.
              </p>

              <p>
                Click
                <a
                  href="${process.env.FRONTEND_URL}/messages"
                  style="color: #10b981;"
                >
                  here
                </a>
                to view them.
              </p>

              <br />

              <p>
                Thanks,<br />
                HangOut - Explore and Meet
              </p>
            </div>
          `;

          await sendEmail({
            to: user.email,
            subject,
            body,
          });

          return {
            message: `Notification sent to ${user.email}`,
          };
        }
      );
    }

    return {
      message: "Unseen-message notifications sent",
      usersNotified: Object.keys(unseenCount).length,
    };
  }
);

export const functions = [
  syncUserCreation,
  syncUserUpdation,
  syncUserDeletion,
  sendNewConnectionRequestReminder,
  deleteStory,
  sendNotificationOfUnseenMessages,
];
